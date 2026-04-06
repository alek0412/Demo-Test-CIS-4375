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
        query_tuple=(first_name,last_name,phone,email.lower(),street_address,city,state,zip_code)
    except (KeyError,TypeError):
        return make_response("Invalid parameters.",400)
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
    salt=urandom(16)
    password_hash=hashlib.pbkdf2_hmac('sha256',password.encode(encoding='utf-8'),salt,50000)
    salted_password=password_hash.hex()
    updated_salt=salt.hex()
    query_tuple+=(salted_password,updated_salt)
    user_query="insert into customer(customer_first_name,customer_last_name,phone,email,street_address,city,state,zip_code,membership_status,birthdate,password,salt) values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"
    create_query=sql_functions.execute_query(sql_connection,user_query,query_tuple)
    if type(create_query)==int:
        return make_response("Server is unable to create customer",503)
    customer_id=sql_functions.execute_read(sql_connection,"Select customer_id from customer where email = %s;",(email,))[0]["customer_id"]
    if type(customer_id)==int:
        print(f"Error code: {customer_id}")
        return make_response("Server is unable to fetch customer",503)
    waiver_query=sql_functions.execute_query(sql_connection,"insert into waiver (customer_id,waiver_status) values(%s,%s)",(customer_id,2))
    if type(waiver_query)==int:
        return make_response("Server is unable to create waiver",503)
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

