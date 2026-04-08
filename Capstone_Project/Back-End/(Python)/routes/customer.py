import hashlib
import sql_functions
import datetime
from flask import request,make_response,Blueprint,session
from os import urandom
from ssh_connection import secure_connection
from dateutil.relativedelta import relativedelta

customer_blueprint=Blueprint("customer",__name__,template_folder="templates")
sql_connection=secure_connection
@customer_blueprint.route("/api/waiver-register",methods=["post"])
def add_customer():
    request_json=request.get_json()
    try:
        first_name=request_json['first_name']
        last_name=request_json['last_name']
        phone=request_json['phone']
        email=request_json['email']
        street_address=request_json['street_address']
        city=request_json['city']
        state=request_json['state']
        zip_code=request_json['zip_code']
        birthdate=request_json['birthdate']
        password=request_json['password']
        emergency_first=request_json['emergency_first']
        emergency_last=request_json['emergency_last']
        relationship=request_json['relationship']
        emergency_phone=request_json['emergency_phone']
        emergency_email=request_json['emergency_email']
        query_tuple=(first_name,last_name,phone,email.lower(),street_address,city,state,zip_code)
        emergency_tuple=(emergency_first,emergency_last,relationship,emergency_phone,emergency_email)
    except (KeyError,TypeError):
        return make_response("Invalid parameters.",400)
    if emergency_phone==phone or emergency_email == email:
        make_response("You cannot have the same contact information for emergency contacts",400)
    email_check=sql_functions.execute_read(sql_connection,"Select email from customer;")
    try:
        for database_email in email_check:
            if database_email['email'].lower() == email:
                return make_response("Email already exists",400)
    except TypeError:
        return make_response("Server is unable to validate email",503)
    membership_difference=relativedelta(datetime.datetime.today(),datetime.datetime.strptime(birthdate,"%Y-%m-%d"))
    if membership_difference.years<23:
        query_tuple+=(1,birthdate)
    elif membership_difference.years>23 and membership_difference.years<55:
        query_tuple+=(2,birthdate)
    else:
        query_tuple+=(3,birthdate)
    salt=urandom(20)
    password_hash=hashlib.pbkdf2_hmac('sha256',password.encode(encoding='utf-8'),salt,50000)
    salted_password=password_hash.hex()
    updated_salt=salt.hex()
    query_tuple+=(salted_password,updated_salt)
    user_query="insert into customer(customer_first_name,customer_last_name,phone,email,street_address,city,state,zip_code,membership_status,birthdate,password,salt) values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"
    emergency_query="insert into emergency_contact(emergency_first,emergency_last,relationship,emergency_phone,emergency_email,customer_id) values(%s,%s,%s,%s,%s,%s)"
    create_query=sql_functions.execute_query(sql_connection,user_query,query_tuple)
    if type(create_query)==int:
        return make_response("Server is unable to create customer",503)
    customer_id=sql_functions.execute_read(sql_connection,"Select customer_id from customer where email = %s;",(email,))
    print(customer_id)
    if type(customer_id)==int:
        print(f"Error code: {customer_id}")
        return make_response("Server is unable to fetch customer",503)
    waiver_query=sql_functions.execute_query(sql_connection,"insert into waiver (customer_id,waiver_status) values(%s,%s);update customer set waiver_id=%s where customer_id=%s",(customer_id[0]['customer_id'],2)+(customer_id[0]['customer_id'],)*2)
    if type(waiver_query)==int:
        return make_response("Server is unable to create waiver",503)
    emergency_execute=sql_functions.execute_query(sql_connection,emergency_query,emergency_tuple+(customer_id[0]['customer_id'],))
    if type(emergency_execute)==int:
        return make_response("Server is unable to create emergency contact",503)
    return make_response("Customer created successfully!",201)
@customer_blueprint.route("/api/customer-login",methods=["post"])
def customer_login():
    request_json=request.get_json()
    try:
        email=request_json['email']
        password=request_json['password']
    except KeyError:
        return make_response("Missing required parameters.",400)
    customer_query=sql_functions.execute_read(sql_connection,"select * from customer where email = %s",(email,))
    if type(customer_query)==int:
        return make_response("Server is unable to get anything",503)
    elif len(customer_query[0])==0:
        return make_response("Server cannot find your email",400)
    hashed_password=hashlib.pbkdf2_hmac('sha256',password.encode(encoding='utf-8'),bytes.fromhex(customer_query[0]['salt']),50000).hex()
    if hashed_password!=customer_query[0]['password'] or email.lower() != customer_query[0]['email']:
        return make_response("Invalid email or password",403)
    #Purge employee in session
    for attribute in session:
        session.pop(attribute)
    for attribute in customer_query[0]:
        if attribute not in ["password","salt"]:
            session[attribute]=customer_query[0][attribute]
    session['password']=request_json['password']
    session['is_employee']=False
    session['is_manager']=False
    session['is_customer']=True
    return make_response("Login successful!",200)

@customer_blueprint.route("/api/customer-logout",methods=['post'])    
def customer_logout():
    for attribute in session:
        session.pop(attribute,None)
    return make_response("Successfully logged out!",200)

@customer_blueprint.route("/api/customer",methods=['delete'])
def customer_remove():
    delete_reservations=sql_functions.execute_query(sql_connection,"delete from reservation where customer_id =%s",values=(session['customer_id'],))
    if type(delete_reservations)==int:
        return make_response("Unable to delete reservations",503)
    delete_waiver=sql_functions.execute_query(sql_connection,"delete from waiver where customer_id = %s",(session['customer_id'],))
    if type(delete_waiver)==int:
        return make_response("Unable to delete waiver",503)
    delete_customer=sql_functions.execute_query(sql_connection,"delete from customer where customer_id=%s",(session['customer_id'],))
    if type(delete_customer)==int:
        return make_response("Unable to delete customer",503)
    for attribute in session:
        session.pop(attribute,None)
    return make_response("Successfully deleted customer!",200)    

@customer_blueprint.route("/api/customer",methods=['patch'])
def update_details():
    fields = ["last_name", "first_name", "email", "street_address","city", "state", "zip_code", "password"]
    request_json=request.get_json()
    for field in fields:
        try:
            if field =="password":
                new_salt=urandom(20)
                new_password = hashlib.pbkdf2_hmac("sha256",request_json['password'],new_salt,50000).hex()
                new_salt=new_salt.hex()
                new_password_query=sql_functions.execute_query(sql_connection,"update customer set password = %s,salt=%s where email = %s",(new_password,new_salt,session['email']))
                if type(new_password_query)==int:
                    return make_response("Unable to update password",503)
            else:
                new_entry_query=sql_functions.execute_query(sql_connection,f"update customer set {field}"+"%s where email =%s",(request_json[field],session['email']))
                if type(new_entry_query)==int:
                    return make_response(f"Unable to update {field}",503)
            session[field] = request_json[field]
        except KeyError:
            pass 
        session.modified=True
        return make_response("Successfully updated customer!",200)      
           
              