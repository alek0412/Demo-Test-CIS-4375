from flask import jsonify,request,make_response,Blueprint,session
from ssh_connection import secure_connection
import sql_functions
import datetime
reservation_blueprint=Blueprint("reservation",__name__,template_folder="templates")
times={
    "weekday":{
        "starting":datetime.datetime.strptime("10:00","%H:%M"),
        "closing":datetime.datetime.strptime("23:30","%H:%M")
        },
    "weekend":{
        "starting":datetime.datetime.strptime("08:00","%H:%M"),
        "ending":datetime.datetime.strptime("23:30","%H:%M")
    }
    }
valid_end_times=["00","15","30","45"]
@reservation_blueprint.route("/api/reservation",methods=["post"])
def add_reservation():
    request_json=request.get_json()
    is_valid_start=False
    is_valid_end=False
    if not session.get("is_customer"):
        return make_response("You must be a customer to reserve",401)
    try:
        court=request_json['court_id']
        customer=session['customer_id']
        waiver=session['waiver_id']
        reservation_date=request_json['reservation_date']
        start_time=request_json['reservation_start_time']
        end_time=request_json['reservation_end_time']
        if type(court)!=int or type(customer)!=int or type(waiver)!=int:
            return make_response("Invalid parameters",400)
        query_tuple=(court,customer,waiver,reservation_date,start_time,end_time,1)
    except KeyError:
        return make_response("Invalid parameters",400)
    try:
        reservation_conversion:datetime=datetime.datetime.strptime(reservation_date,"%Y-%m-%d")
        start_time_conversion=datetime.datetime.strptime(start_time,"%H:%M")
        end_time_conversion=datetime.datetime.strptime(end_time,"%H:%M")
        advance_days=(reservation_conversion-datetime.datetime.now()).days
        if advance_days<0 or advance_days>14:
            return make_response("Unable to reserve in past or reserve for more than 14 days.")
        reservation_day_type=reservation_conversion.weekday()
        day_type="weekday" if reservation_day_type in range(5) else "weekend"
        if (start_time_conversion-times[day_type]["starting"]).total_seconds()<0 or (end_time_conversion-times[day_type]["closing"]).total_seconds()>0:
            return make_response("Cannot reserve outside of business hours",400)
        elif (end_time_conversion-start_time_conversion).total_seconds()>(60*60*4.5):
            return make_response("Cannot reserve for more than 4.5 hours",400)
        elif (end_time_conversion-start_time_conversion).total_seconds()<(60*15):
            return make_response("Cannot reserve for less than 15 minutes",400)
        for timestamp in valid_end_times:
            if start_time.endswith(timestamp):
                is_valid_start=True
            elif end_time.endswith(timestamp):
                is_valid_end=True
        if not is_valid_start or not is_valid_end:
            return make_response("All times must end with a multiple of 15 minutes",400)
    except (ValueError,TypeError):
        return make_response("Invalid date format",400)
    reserved_court_values=sql_functions.execute_read(secure_connection,"select court_id,reservation_start_time,reservation_end_time where court_id=%s",(court))
    if type(reserved_court_values)==int:
        return make_response("Unable to fetch court times",503)
    for court_booking in reserved_court_values:
        court_booking_start=datetime.datetime.strptime(reserved_court_values[court_booking]['reservation_start_time'],"%H:%M")
        court_booking_end=datetime.datetime.strptime(reserved_court_values[court_booking]['reservation_end_time'],"%H:%M")
        if (start_time_conversion-court_booking_start).total_seconds()>0 and (start_time_conversion-court_booking_end)<0:
            return make_response("Court is already booked",400)
    customer_availability=sql_functions.execute_read(secure_connection,"select * from waiver where customer_id=%s",(customer,))
    if type(customer_availability)==int:
        return make_response("Server is unable to fetch waiver",503)
    if customer_availability[0]['waiver_status'] !=2:
        return make_response("Customer is not available for booking",400)
    reservation_create=sql_functions.execute_query(secure_connection,"insert into reservation(court_id,customer_id,waiver_id,reservation_date,reservation_start_time,reservation_end_time,reservation_status) values(%s,%s,%s,%s,%s,%s,%s)",query_tuple)
    if type(reservation_create)==int:
        return make_response("Server is unable to create reservation",503)
    customer_update=sql_functions.execute_query(secure_connection,"update waiver set waiver_status=3 where waiver_id=%s",(waiver,))
    if type(customer_update)==int:
        return make_response("Server is unable to update customer",503)
    return make_response("Reservation is now pending, please wait for staff to approve or deny your request...",201)

@reservation_blueprint.route("/api/reservation",methods=["get"])
def get_reservation():
    request_json=request.get_json()
    pending_reservations=sql_functions.execute_read(secure_connection,"select * from reservation where reservation_status=1")
    if type(pending_reservations)==int:
        return make_response("Unable to fetch pending reservations",503)
    return jsonify(pending_reservations)


@reservation_blueprint.route("/api/reservation",methods=["patch"])
def reservation_approval():
    request_json=request.json()
    try:
        reservation_id=request_json["reservation_id"]
        reservation_status=request_json["reservation_status"]
    except KeyError:
        return make_response("Missing reservation parameters",400)
    if not session.get("is_employee"):
        return make_response("Invalid authorization for approval",401)
    elif type(reservation_id)!=int or type(reservation_status)!=int:
        return make_response("Invalid reservation parameters",400)
    reservation_fetch=sql_functions.execute_read(secure_connection,"select reservation_status from reservation where reservation_id=%s",(reservation_id,))
    if type(reservation_fetch)==int:
        return make_response("Server cannot fetch reservation",503)
    #If reservation is pending and reservation_status is not "Approve" or "Deny"
    elif reservation_fetch[0]['reservation_status']==1 and reservation_status not in [2,3]:
        return make_response("Cannot perform this action on a pending reservation",400)
    #If reservation is approved and reservation_status is not "Cancel"
    elif reservation_fetch[0][reservation_status]==2 and reservation_status!=4:
        return make_response("Cannot perform this action on an approved reservation")
    reservation_update=sql_functions.execute_read(secure_connection,"update reservation set reservation_status=%s,employee_id=%s where reservation_id=%s",(reservation_status,session['employee_id'],reservation_id))
    if type(reservation_update)==int:
        return make_response("Server cannot update reservation",503)
    return make_response(f"Successfully {"approved" if reservation_status == 2 else "denied"} reservation!",201)

    
    