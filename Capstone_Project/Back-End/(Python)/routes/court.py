from flask import jsonify,request,make_response,Blueprint,session
import sql_functions
from ssh_connection import secure_connection

court_blueprint=Blueprint("court",__name__,template_folder="templates")

@court_blueprint.route("/api/court",methods=["post"])
def add_court():
    request_json=request.get_json()
    try:
        court_type=request_json['court_type']
        if type(court_type)!=int:
            return make_response("Invalid court type",400)
        if not session.get("is_employee") and not session.get("is_manager"):
            return make_response("Invalid authorization",401)
    except KeyError:
        return make_response("Unable to make court",400)

    court_query=sql_functions.execute_query(secure_connection,"insert into court (court_type,court_availability) values(%s,%s)",(court_type,True))
    if type(court_query)==int:
        return make_response("Unable to create court",503)
    return make_response("Court successfully created",201)


@court_blueprint.route("/api/court",methods=["get"])
def get_court():
    request_json=request.get_json()
    try:
        court_id=request_json['court_id']
        if type(court_id)!=int:
            return make_response("Invalid court",400)
    except KeyError:
        return make_response("Invalid court",400)
    court_fetch = sql_functions.execute_read(secure_connection,"select court_type.sport,court_availability from court left join court_type on court.court_type=court_type.court_type where court_id=%s;",(court_id,))
    if type(court_fetch)==int:
        return make_response("Unable to retrieve court",503)
    return jsonify(court_fetch)

@court_blueprint.route("/api/court",methods=["patch"])
def update_court():
    request_json=request.get_json()
    try:
        court_id=request_json['court_id']
        available=request_json["court_availability"]
        if type(available)!= bool or type(court_id)!=int:
            return make_response("Invalid court or attribute",400)
        if not session.get("is_employee"):
            return make_response("Invalid authorization",401)
    except KeyError:
        return make_response("Invalid court",400)

    court_query=sql_functions.execute_query(secure_connection,"update table court set court_availability =%s where court_id=%s",(available,court_id))
    if type(court_query)==int:
        return make_response("Server is unable to update",503)
    return make_response("Court successfully updated",200)

@court_blueprint.route("/api/court",methods=["delete"])
def delete_court():
    request_json=request.get_json()
    try:
        court_id=request_json['court_id']
        if type(court_id)!=int:
            return make_response("Invalid court",400)
        if not session.get("is_employee") and not session.get("is_manager"):
            return make_response("Invalid authorization",401)
    except KeyError:
        return make_response("Invalid court",400)

    delete_reservations=sql_functions.execute_query(secure_connection,"delete from reservation where court_id=%s",(court_id,))
    if type(delete_reservations)==int:
        return make_response("Unable to delete court from reservations",503)
    delete_court=sql_functions.execute_query(secure_connection,"delete from court where court_id=%s",(court_id,))
    if type(delete_court)==int:
        return make_response("Unable to delete court",503)
    return make_response("Court successfully deleted",200)

@court_blueprint.route("/api/available-court", methods=["get"])
def available_courts():
    available_court_result=sql_functions.execute_read(secure_connection,"select court_id,court_type.sport from court left join court_type on court.court_type=court_type.court_type where court_availability=1 order by sport;")
    if type(available_court_result)==int:
        return make_response("Unable to fetch available courts",503)
    return jsonify(available_court_result)