import mysql.connector
from mysql.connector import Error
from mysql.connector.errors import OperationalError


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


def _should_retry_db_transient(err):
    msg = str(err).lower()
    if "not available" in msg or "lost connection" in msg:
        return True
    if isinstance(err, OperationalError):
        errno = getattr(err, "errno", None)
        return errno in (2006, 2013, 2055)
    return False


def execute_query(connection, query, values=None):
    import ssh_connection as sc

    for attempt in range(2):
        connection = sc.ensure_live_connection()
        if isinstance(connection, int):
            return connection
        cursor = connection.cursor(prepared=True)
        try:
            if values is None:
                cursor.execute(query)
            else:
                cursor.execute(query, values)
            connection.commit()
            return "success"
        except Error as e:
            print(f"The error {e} occurred.")
            if attempt == 0 and _should_retry_db_transient(e):
                continue
            return e.errno
        finally:
            try:
                cursor.close()
            except Exception:
                pass


def execute_read(connection, query, values=None):
    import ssh_connection as sc

    for attempt in range(2):
        connection = sc.ensure_live_connection()
        if isinstance(connection, int):
            return connection
        cursor = connection.cursor(dictionary=True, prepared=True)
        try:
            if values is None:
                cursor.execute(query)
            else:
                cursor.execute(query, values)
            result = cursor.fetchall()
            return result
        except Error as e:
            print(f"The error {e} occurred.")
            if attempt == 0 and _should_retry_db_transient(e):
                continue
            return e.errno
        finally:
            try:
                cursor.close()
            except Exception:
                pass