from flask import jsonify,request,make_response,Blueprint
import sql_functions


reservation_blueprint=Blueprint("reservation",__name__,template_folder="templates")

@reservation_blueprint.route("/api/reservation",methods=["post"])
def add_reservation():
    request_json=request.get_json()
    try:


@reservation_blueprint.route("/api/reservation",methods=["get"])
def get_reservation():
    request_json=request.get_json()


@reservation_blueprint.route("/api/reservation",methods=["patch"])

@reservation_blueprint.route("/api/reservation",methods=["delete"])