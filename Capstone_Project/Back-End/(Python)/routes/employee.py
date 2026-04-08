import sql_functions
import hashlib
import os
from flask import jsonify,request,make_response,Blueprint,session
from ssh_connection import secure_connection
employee_blueprint=Blueprint("employee",__name__,template_folder="templates")
sql_connection=secure_connection
@employee_blueprint.route("/api/employee-create",methods=["post"])
def create_employee():
    request_json=request.get_json()
    try:
        if not session['is_manager'] or not session['is_employee'] or session['is_customer']:
            return make_response("You don't have the authorization to create employee",403)
        last_name:str=request['last_name']
        first_name:str=request['first_name']
        phone=request['phone']
        password:str=request['password']
        salt=os.urandom(20)
        hashed_password=hashlib.pbkdf2_hmac("sha256",password.encode(encoding='utf-8'),salt,50000).hex()
        hex_salt=salt.hex()
        stripped_first="".join(list(filter(lambda x:x.isalpha() and x.isascii()),first_name))
        stripped_last="".join(list(filter(lambda x:x.isalpha() and x.isascii()),last_name))
        email=f"{stripped_first}.{stripped_last}@hbcstaff.com".lower()
        query_tuple=(last_name,first_name,email,phone,2,hashed_password,hex_salt)
        employee_query=sql_functions.execute_query(sql_connection,"insert into employee (employee_last_name,employee_first_name,employee_email,employee_phone,employee_rank,employee_password,employee_salt)",query_tuple)
        if type(employee_query)==int:
            return make_response("Server is unable to create employee")
        return make_response("Employee successfully created",201)
    except (KeyError,TypeError):
        return make_response("Invalid employee details or improper authorization",403)
    

@employee_blueprint.route("/api/login",methods=["post"])
def login_employee():
    request_json=request.get_json()
    try:
        email:str=request_json['email']
        password:str=request_json['password']
    except KeyError:
        return make_response("Invalid attributes",400)
    employee_query=sql_functions.execute_read(sql_connection,"select * from employee where email = %s",(email,))
    if type(employee_query)==int:
        return make_response("Unable to fetch employee details",503)
    hashed_password=hashlib.pbkdf2_hmac("sha256",password.encode(encoding='utf-8'),bytes.fromhex(employee_query[0]['employee_salt']),50000).hex()
    if hashed_password != employee_query[0]['employee_password'] or email.lower() != employee_query[0]['employee_email']:
        return make_response("Invalid email or password",403)
    #Purge customer in session
    for attribute in session:
        session.pop(attribute)
    #Add employee details
    for attribute in employee_query[0]:
        if attribute not in ["employee_password","employee_salt"]:
            session['attribute']=employee_query[0][attribute]
    session['is_employee']=True
    session['is_customer']=False
    if session['employee_rank']==1:
        session['is_manager']==True
    else:
        session['is_manager']==False
    return make_response("Login successful",200)
@employee_blueprint.route("/api/logout",methods=['post'])
def employee_signout():
    for attribute in session:
        session.pop(attribute,None)
    return make_response("Successfully logged out!",200)