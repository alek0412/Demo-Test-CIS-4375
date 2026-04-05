import dotenv
from sql_functions import create_conn,execute_query
from os import environ,urandom
from sshtunnel import SSHTunnelForwarder
import secrets
from random import randint
import hashlib
dotenv.load_dotenv("backend_access.env")
with SSHTunnelForwarder(
    (environ['SSH_HOST'],22),
    ssh_pkey=environ['SSH_PKEY'],
    ssh_username=environ['SSH_USER'],
    remote_bind_address=(environ["DB_HOST"],int(environ["DB_PORT"]))
) as server:
    sql_connection=create_conn(environ['DB_USER'],environ['DB_PASSWORD'],environ['DB_NAME'],server)
    passwords=[]
    salts=[]
    for i in range(50):
        passwords.append(secrets.token_urlsafe(randint(8,20)))
        salts.append(urandom(20))
        hashed_password=hashlib.pbkdf2_hmac("sha-256",passwords[i].encode(encoding='utf-8'),salts[i],50000).hex()
        salt=salts[i].hex()
        print(hashed_password,salt)
        execute_query(sql_connection,"update customer set password=%s,salt=%s where customer_id=%s",(hashed_password,salt,i+1))
    with open("passwords.txt","w") as passwords_file:
        passwords_file.write("\n".join(passwords))


