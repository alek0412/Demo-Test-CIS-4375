import dotenv
from os import environ
from sql_functions import create_conn
from sshtunnel import SSHTunnelForwarder
dotenv.load_dotenv("backend_access.env")
tunnel=None
sql_connection=None

def ssh_hell():
    global tunnel,sql_connection
    tunnel =SSHTunnelForwarder(
        (environ['SSH_HOST'],22),
        ssh_pkey=environ['SSH_PKEY'],
        ssh_username=environ['SSH_USER'],
        remote_bind_address=(environ["DB_HOST"],int(environ["DB_PORT"]))
    ) 
    tunnel.start()
    sql_connection=create_conn(environ['DB_USER'],environ['DB_PASSWORD'],environ['DB_NAME'],tunnel)
    return sql_connection

secure_connection=ssh_hell()