import flask
import dotenv
import waitress
from os import environ
from routes.customer import customer_blueprint
from routes.employee import employee_blueprint
from datetime import timedelta
flask_server =flask.Flask(__name__)
dotenv.load_dotenv("backend_access.env")
flask_server.secret_key=environ['SECRET_KEY']
flask_server.permanent_session_lifetime=timedelta(days=7)
flask_server.register_blueprint(customer_blueprint)
flask_server.register_blueprint(employee_blueprint)
if __name__ =="__main__":
    waitress.serve(flask_server,port=3000)