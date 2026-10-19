Extension { #name : 'PyTzinfo' }

{ #category : 'Grail-Introspection' }
PyTzinfo class >> __module__ [
	"Pickling a tzinfo pickles its CLASS by (module, qualname), and
	pickle.py's _find_global rejects a class whose __module__ is not a
	string (test_pickling_base).  PyTimezone declares its own; the base
	class had none."

	^ 'datetime'

]

{ #category : 'Grail-Introspection' }
PyTzinfo class >> __name__ [
	^ self @env0:== PyTzinfo
		ifTrue: ['tzinfo']
		ifFalse: [super __name__]

]

{ #category : 'Grail-Introspection' }
PyTzinfo class >> __qualname__ [
	^ self @env0:== PyTzinfo
		ifTrue: ['tzinfo']
		ifFalse: [super __qualname__]

]

{ #category : 'Grail-Pickle' }
PyTzinfo >> __reduce__ [
	"(class, initargs, state) — CPython's tzinfo.__reduce__.

	tzinfo itself carries no data, but it must still be picklable so that
	concrete subclasses can be (test_pickling_base).  Args come from
	__getinitargs__ when the subclass defines one (timezone does);
	otherwise the subclass is reconstructed by calling it with NO
	arguments and its instance namespace is reapplied as state, which is
	how PicklableFixedOffset's offset/name survive the round trip
	(test_pickling_subclass) -- pickle.py's `r' opcode hands the third
	element to __setstate__, or merges it into the instance when it is a
	plain dict."

	| args state |
	args := (self ___respondsTo___: #'__getinitargs__')
		ifTrue: [self __getinitargs__]
		ifFalse: [tuple @env0:new].
	"State comes from __getstate__ rather than being rebuilt from
	dynamicInstanceVariables here.  Those hold only the __dict__ half:
	__slots__ values live in NAMED instance variables, so a slotted
	subclass pickled with every slot missing and came back with them
	unset -- utcoffset() answered None after a round trip
	(test_pickling_subclass, PicklableFixedOffsetWithSlots).
	object>>__getstate__ answers CPython's (dict, slots) 2-tuple for such
	a class, which pickle.py's BUILD already restores, and the plain dict
	for every other."
	state := self __getstate__.
	^ tuple @env0:withAll: { self @env0:class. args. state }

]

{ #category : 'Grail-Attribute Access' }
PyTzinfo >> __setattr__: name _: value [
	"Exact tzinfo/timezone instances have no attribute storage in CPython
	(test_extra_attributes); user subclasses -- which is the whole point of
	tzinfo -- fall through and keep theirs."

	((self @env0:class @env0:== PyTzinfo) @env0:or: [self @env0:class @env0:== PyTimezone]) ifTrue: [
		^ AttributeError ___signal___:
			'''datetime.' @env0:, (self @env0:class @env0:== PyTimezone
				ifTrue: ['timezone'] ifFalse: ['tzinfo'])
			@env0:, ''' object has no attribute ''' @env0:, name @env0:asString @env0:, ''''].
	^ super __setattr__: name _: value

]

{ #category : 'Grail-Abstract' }
PyTzinfo >> dst: dt [
	^ NotImplementedError ___signal___: 'tzinfo subclass must override dst()'

]

{ #category : 'Grail-Abstract' }
PyTzinfo >> fromutc: dt [
	"Default tzinfo.fromutc (CPython): shift a UTC datetime tagged with
	self into local time via utcoffset()/dst()."

	| dtoff dtdst delta d |
	d := dt.
	"CPython checks the argument type FIRST -- without this, Eastern.fromutc(
	date.today()) died on a raw `#tzinfo not understood by PyDate' Smalltalk
	error instead of a catchable TypeError (test_fromutc)."
	(d @env0:isKindOf: PyDateTime) ifFalse: [
		^ TypeError ___signal___: 'fromutc() requires a datetime argument'].
	(d tzinfo @env0:== self) ifFalse: [^ ValueError ___signal___: 'dt.tzinfo is not self'].
	dtoff := d utcoffset.
	dtdst := d dst.
	(dtoff @env0:== None or: [dtdst @env0:== None]) ifTrue: [
		^ ValueError ___signal___: 'fromutc() requires a non-None utcoffset() result'].
	delta := dtoff __sub__: dtdst.
	(delta __bool__) ifTrue: [
		d := d __add__: delta.
		dtdst := d dst.
		dtdst @env0:== None ifTrue: [
			^ ValueError ___signal___: 'fromutc(): dt.dst gave inconsistent results; cannot convert']].
	^ d __add__: dtdst

]

{ #category : 'Grail-Abstract' }
PyTzinfo >> tzname: dt [
	^ NotImplementedError ___signal___: 'tzinfo subclass must override tzname()'

]

{ #category : 'Grail-Abstract' }
PyTzinfo >> utcoffset: dt [
	"Abstract: a tzinfo subclass must override utcoffset()."

	^ NotImplementedError ___signal___: 'tzinfo subclass must override utcoffset()'

]
