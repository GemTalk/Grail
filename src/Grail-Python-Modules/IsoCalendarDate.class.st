Class {
	#name : 'IsoCalendarDate',
	#superclass : 'tuple',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Introspection' }
IsoCalendarDate class >> ___pythonValueAttrs___ [
	"Register year/week/weekday as auto-invoked DATA attributes (like
	PyDate's own year/month/day) rather than plain callables -- without
	this, ``t.year'' resolves to a bound method object instead of the
	int value (test_isocalendar)."

	^ IdentitySet new
		add: #year;
		add: #week;
		add: #weekday;
		"Inherited from tuple, which lists it -- see struct_time's copy."
		add: #'__dict__';
		yourself

]
