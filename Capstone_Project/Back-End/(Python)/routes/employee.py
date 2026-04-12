import sql_functions
import hashlib
import os
from flask import jsonify,request,make_response,Blueprint,session
from ssh_connection import secure_connection
employee_blueprint=Blueprint("employee",__name__,template_folder="templates")
sql_connection=secure_connection
@employee_blueprint.route("/api/employee-create",methods=["post"])
def create_employee():
    request_json=request.get_json(silent=True) or {}
    if not session.get("is_manager") or not session.get("is_employee") or session.get("is_customer"):
        return make_response("You don't have the authorization to create employee",401)

    raw_last = request_json.get("last_name")
    raw_first = request_json.get("first_name")
    raw_phone = request_json.get("phone")
    raw_password = request_json.get("password")
    missing = []
    if raw_last is None or (isinstance(raw_last, str) and not raw_last.strip()):
        missing.append("last_name")
    if raw_first is None or (isinstance(raw_first, str) and not raw_first.strip()):
        missing.append("first_name")
    if raw_phone is None or (isinstance(raw_phone, str) and not str(raw_phone).strip()):
        missing.append("phone")
    if raw_password is None or (isinstance(raw_password, str) and not str(raw_password)):
        missing.append("password")
    if missing:
        return make_response("Missing or empty fields: " + ", ".join(missing), 400)

    try:
        last_name = str(raw_last).strip().capitalize()
        first_name = str(raw_first).strip().capitalize()
        phone = str(raw_phone).strip()
        password = str(raw_password)
        salt=os.urandom(20)
        hashed_password=hashlib.pbkdf2_hmac("sha256",password.encode(encoding='utf-8'),salt,50000).hex()
        hex_salt=salt.hex()
        stripped_first="".join(list(filter(lambda x:x.isalpha() and x.isascii()),first_name))
        stripped_last="".join(list(filter(lambda x:x.isalpha() and x.isascii()),last_name))
        if not stripped_first or not stripped_last:
            return make_response(
                "Each name needs at least one A–Z letter to build the staff email (firstname.lastname@hbcstaff.com).",
                400,
            )
        email=f"{stripped_first}.{stripped_last}@hbcstaff.com".lower()
        query_tuple=(last_name,first_name,email,phone,2,hashed_password,hex_salt)
        employee_query=sql_functions.execute_query(
            sql_connection,
            "insert into employee (employee_last_name,employee_first_name,employee_email,employee_phone,employee_rank,employee_password,employee_salt) values (%s,%s,%s,%s,%s,%s,%s)",
            query_tuple,
        )
        if type(employee_query)==int:
            return make_response("Server is unable to create employee",503)
        return make_response("Employee successfully created",201)
    except (TypeError, ValueError) as e:
        return make_response("Invalid employee details: " + str(e), 400)
    

@employee_blueprint.route("/api/login",methods=["post"])
def login_employee():
    request_json=request.get_json(silent=True) or {}
    try:
        email:str=request_json['email']
        password:str=request_json['password']
    except KeyError:
        return make_response("Invalid attributes",400)
    employee_query=sql_functions.execute_read(sql_connection,"select * from employee where employee_email = %s",(email,))
    if type(employee_query)==int:
        return make_response("Unable to fetch employee details",503)
    if not employee_query or len(employee_query)==0:
        return make_response("Invalid email or password",401)
    try:
        salt_hex = employee_query[0].get("employee_salt") or ""
        hashed_password=hashlib.pbkdf2_hmac("sha256",password.encode(encoding='utf-8'),bytes.fromhex(salt_hex),50000).hex()
    except (ValueError, TypeError):
        return make_response("Invalid email or password",401)
    if hashed_password != employee_query[0]['employee_password'] or email.lower() != employee_query[0]['employee_email']:
        return make_response("Invalid email or password",401)
    #Purge customer in session
    session.clear()
    #Add employee details
    for attribute in employee_query[0]:
        if attribute not in ["employee_password","employee_salt"]:
            session[attribute]=employee_query[0][attribute]
    session["is_employee"]=True
    session["is_customer"]=False
    try:
        rank = employee_query[0].get("employee_rank")
        session["is_manager"] = int(rank) == 1
    except (TypeError, ValueError):
        session["is_manager"] = False
    return make_response("Login successful",200)
@employee_blueprint.route("/api/logout",methods=['post'])
def employee_signout():
    session.clear()
    return make_response("Successfully logged out!",200)

@employee_blueprint.route("/api/delete",methods=['delete'])
def employee_fire():
    try:
        request_json=request.get_json(force=True, silent=True) or {}
        employee_id=request_json.get('employee_id')
        if employee_id is None:
            raise KeyError("employee_id")
        employee_id=int(employee_id)
        if not session.get("is_manager"):
            return make_response("Invalid authorization",401)
    except (KeyError,TypeError):
        return make_response("Invalid employee",400)
    delete_reservations=sql_functions.execute_query(sql_connection,"delete from reservation where employee_id=%s",(employee_id,))
    if type(delete_reservations)==int:
        return make_response("Server is unable to delete from reservation",503)
    delete_employee=sql_functions.execute_query(sql_connection,"delete from employee where employee_id=%s",(employee_id,))
    if type(delete_employee)==int:
        return make_response("Server is unable to delete employee",503)
    return make_response("Employee successfully fired!",200)

@employee_blueprint.route("/api/change-employee",methods=['patch'])
def employee_change():
    valid_attributes=["employee_last_name","employee_first_name","employee_phone","employee_password"]
    request_json=request.get_json(force=True, silent=True) or {}
    last_name=request_json.get("employee_last_name")
    first_name=request_json.get("employee_first_name")
    employee_id=request_json.get("employee_id")
    if employee_id is None:
        return make_response("Invalid employee",400)
    try:
        employee_id=int(employee_id)
    except (TypeError, ValueError):
        return make_response("Invalid employee",400)
    if not session.get("is_manager"):
        return make_response("Invalid permissions",401)
    employee_retrieve=sql_functions.execute_read(sql_connection,"select * from employee where employee_id=%s",(employee_id,))
    if type(employee_retrieve) == int or len(employee_retrieve)==0:
        return make_response("Server is unable to fetch employee",503)
    database_last=employee_retrieve[0]['employee_last_name']
    database_first=employee_retrieve[0]['employee_first_name']
    is_name_changed=False
    new_email=f"{last_name.lower() if last_name and type(last_name)==str else database_last}.{first_name.lower() if first_name and type(first_name)==str else database_first}@hbcstaff.com"
    for attribute in valid_attributes:
        attribute_value=request_json.get(attribute)
        database_attribute=employee_retrieve[0].get(attribute)
        if attribute_value and attribute_value!=database_attribute:
            if attribute in ["employee_last_name","employee_first_name"] and type(attribute_value)==str:
                attribute_value=attribute_value.capitalize()
                if attribute_value != database_attribute:
                    is_name_changed=True
                    update_name=sql_functions.execute_query(sql_connection,f"update employee set {attribute}="+"%s where employee_id=%s",(attribute_value,employee_id))
                    if type(update_name)==int:
                        return make_response("Server is unable to change name",503)
                else:
                    continue
            elif attribute=="employee_password":
                new_salt=os.urandom(20)
                attribute_value=hashlib.pbkdf2_hmac("sha256",attribute_value.encode(encoding='utf-8'),new_salt,50000).hex()
                new_salt=new_salt.hex()
                update_password=sql_functions.execute_query(sql_connection,"update employee set employee_password=%s,employee_salt=%s where employee_id=%s",(attribute_value,new_salt,employee_id))
                if type(update_password)==int:
                    return make_response("Server is unable to change password",503)
            else:
                update_attribute=sql_functions.execute_query(sql_connection,f"update employee set {attribute}="+"%s where employee_id=%s",(attribute_value,employee_id))
                if type(update_attribute)==int:
                    return make_response("Server is unable to change attribute",503)
    if is_name_changed:
        update_email=sql_functions.execute_query(sql_connection,"update employee set employee_email=%s where employee_id=%s",(new_email,employee_id))
        if type(update_email)==int:
            return make_response("Server is unable to change email",503)
    return make_response("Successfully updated employee",200)
        