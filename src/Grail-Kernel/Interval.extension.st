Extension { #name : 'Interval' }

{ #category : 'Grail-Python Attribute Hook' }
Interval class >> ___pythonValueAttrs___ [
	"CPython's range carries start/stop/step as read-only ATTRIBUTES, not
	methods: ``range(10).start'' is 0, not a bound method.  Without this
	whitelist ``r.start'' answered a BoundMethod, so any arithmetic or
	comparison on it silently operated on the method object -- and pickling a
	range (whose reduction is ``(range, (start, stop, step))'') tried to
	serialize three BoundMethods instead of three ints."

	^ IdentitySet new
		add: #start;
		add: #stop;
		add: #step;
		yourself

]
