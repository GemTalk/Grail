Class {
	#name : 'struct_time',
	#superclass : 'PyStructSequence',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Fields' }
struct_time class >> ___namedOnlyFields___ [
	"tm_zone and tm_gmtoff, past the nine the tuple holds (Modules/timemodule.c,
	struct_time_type_fields)."

	^ #(#'tm_zone' #'tm_gmtoff')

]

{ #category : 'Grail-Introspection' }
struct_time class >> ___pythonValueAttrs___ [
	"Register the tm_* names as auto-invoked DATA attributes rather than
	plain callables -- without this ``t.tm_year'' resolves to a bound
	method object instead of the int (same mechanism as IsoCalendarDate's
	year/week/weekday in datetime_module.gs)."

	^ IdentitySet new
		add: #tm_year;
		add: #tm_mon;
		add: #tm_mday;
		add: #tm_hour;
		add: #tm_min;
		add: #tm_sec;
		add: #tm_wday;
		add: #tm_yday;
		add: #tm_isdst;
		"Inherited from tuple, which lists it in its own copy of this set --
		the first class answering the hook wins, so a subclass that lists its
		own attributes has to list this one too, or ``t.__dict__'' reads as a
		bound method instead of raising AttributeError."
		add: #'__dict__';
		yourself

]

{ #category : 'Grail-Fields' }
struct_time class >> ___sequenceNames___ [
	^ #(#'tm_year' #'tm_mon' #'tm_mday' #'tm_hour' #'tm_min' #'tm_sec' #'tm_wday'
		#'tm_yday' #'tm_isdst')

]

{ #category : 'Grail-Fields' }
struct_time class >> ___typeName___ [
	^ 'time.struct_time'

]
