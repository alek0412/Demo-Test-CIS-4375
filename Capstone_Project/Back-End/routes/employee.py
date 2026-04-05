from flask import jsonify,request,make_response,Blueprint,session
import sql_functions


employee_blueprint=Blueprint("employee",__name__,template_folder="templates")
@employee_blueprint.route("/api/employee-create",methods=["post"])
def create_employee():
    try:
        if not session['is_manager'] or not session['is_employee']:
            return make_response("You cannot create employee",403)
        
    except KeyError:
        return make_response("You don't have authorization to create employee",403)
@employee_blueprint.route("/api/login",methods=["post"])
def login_employee():
    request_json=request.get_json()
    try:
        email=request_json['email']
        password=request_json['password']
    except KeyError:
        return make_response("Invalid attributes",400)