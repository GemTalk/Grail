"Python datetime module - date/time arithmetic.

Provides date / time / datetime / timedelta / timezone.  Smalltalk-
backed; arithmetic goes through PyTimedelta normalized integer
microseconds.  tzinfo is the canonical abstract base; concrete
subclasses (PyTimezone) provide ``utcoffset(dt)' / ``tzname(dt)'
/ ``dst(dt)'.

Common access:
  datetime.datetime.now(datetime.timezone.utc)
  datetime.datetime.fromisoformat(s)
  datetime.date.today()
  datetime.time(12, 30)
  datetime.timedelta(seconds=N)
  datetime.timezone.utc

"
Class {
	#name : 'datetime',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Introspection' }
datetime class >> ___pythonValueAttrs___ [
	"Class references are value-attrs so `datetime.datetime(...)`
	resolves the class then calls __new__ on it."

	^ IdentitySet new
		add: #date;
		add: #time;
		add: #datetime;
		add: #timedelta;
		add: #timezone;
		add: #tzinfo;
		add: #UTC;
		add: #MINYEAR;
		add: #MAXYEAR;
		add: #'__all__';
		yourself

]
