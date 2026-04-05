from flask import jsonify,request,make_response,Blueprint
import sql_functions


court_blueprint=Blueprint("court",__name__,template_folder="templates")

@court_blueprint.route("/api/court",methods=["post"])
def add_court():
    request_json=request.get_json()
    try:


@court_blueprint.route("/api/court",methods=["get"])
def get_court():
    request_json=request.get_json()


@court_blueprint.route("/api/court",methods=["patch"])


@court_blueprint.route("/api/court",methods=["delete"])