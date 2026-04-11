import flask
import dotenv
import waitress
from os import environ
from routes.customer import customer_blueprint
from routes.employee import employee_blueprint
from routes.court import court_blueprint
from routes.reservation import reservation_blueprint
from datetime import timedelta
flask_server =flask.Flask(__name__)
dotenv.load_dotenv("backend_access.env")
flask_server.secret_key=environ['SECRET_KEY']
flask_server.permanent_session_lifetime=timedelta(days=7)
flask_server.register_blueprint(customer_blueprint)
flask_server.register_blueprint(employee_blueprint)
flask_server.register_blueprint(court_blueprint)
flask_server.register_blueprint(reservation_blueprint)
flask_server.debug=True
if __name__ =="__main__":
    waitress.serve(flask_server,port=3001)
    

    
    