import mysql.connector
from mysql.connector import Error


def _conn(connection):
    """Always use a live DB connection (SSH tunnel + MySQL may drop after idle time)."""
    import ssh_connection as sc

    return sc.ensure_live_connection()


def create_conn(user_name,pas,db_name,tunnel):
    connection = None
    try:
        connection = mysql.connector.connect(
            host="127.0.0.1",
            user=user_name,
            password=pas,
            db=db_name,
            port=tunnel.local_bind_port,
            use_pure=True
            
        )
        print("Connection successful! Accessing database...")
        return connection
    except Error as e:
        print(f"The error {e} occurred.")
        return e.errno
def execute_query(connection, query, values=None):
    connection = _conn(connection)
    if isinstance(connection, int):
        return connection
    cursor = connection.cursor(prepared=True)
    try:
        cursor.execute(query,values)
        connection.commit()
        return "success"
    except Error as e:
        print(f"The error {e} occurred.")
        return e.errno
def execute_read(connection, query, values=None):
    connection = _conn(connection)
    if isinstance(connection, int):
        return connection
    cursor = connection.cursor(dictionary=True, prepared=True)
    try:
        cursor.execute(query,values)
        result = cursor.fetchall()
        return result
    except Error as e:
        print(f"The error {e} occurred.")
        return e.errno