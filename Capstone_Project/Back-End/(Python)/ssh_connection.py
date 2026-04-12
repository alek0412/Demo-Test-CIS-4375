import dotenv
from os import environ
from sql_functions import create_conn
from sshtunnel import SSHTunnelForwarder

tunnel = None
sql_connection = None
secure_connection = None


def ssh_hell():
    global tunnel, sql_connection, secure_connection
    dotenv.load_dotenv("backend_access.env")
    tunnel = SSHTunnelForwarder(
        (environ["SSH_HOST"], 22),
        ssh_pkey=environ["SSH_PKEY"],
        ssh_username=environ["SSH_USER"],
        remote_bind_address=(environ["DB_HOST"], int(environ["DB_PORT"])),
    )
    tunnel.start()
    sql_connection = create_conn(
        environ["DB_USER"], environ["DB_PASSWORD"], environ["DB_NAME"], tunnel
    )
    secure_connection = sql_connection
    return sql_connection


def ensure_live_connection():
    """Recreate SSH tunnel + MySQL connection if the pool died (idle timeout, network blip)."""
    global tunnel, sql_connection, secure_connection
    if sql_connection is not None and not isinstance(sql_connection, int):
        try:
            if sql_connection.is_connected():
                return sql_connection
        except Exception:
            pass
    try:
        if tunnel is not None:
            tunnel.stop()
    except Exception:
        pass
    tunnel = None
    sql_connection = None
    secure_connection = None
    res = ssh_hell()
    return res


secure_connection = ssh_hell()