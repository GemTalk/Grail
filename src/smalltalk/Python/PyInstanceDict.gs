! ------------------- Superclass check
run
PythonInstance ifNil: [self error: 'PythonInstance is not defined. Check file ordering.'].
%

! ------- PyInstanceDict class definition
expectvalue /Class
doit
Object subclass: 'PyInstanceDict'
  instVarNames: #( source )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyInstanceDict comment:
'Live view of a PythonInstance''s dynamic-instVar storage as a
Python-style dict.  Returned by ``PythonInstance >> __dict__''.

Reads and writes flow through the underlying instance''s
dynamicInstVarAt: / dynamicInstVarAt:put: so mutations on the view
(``rv.__dict__.update(self.__dict__)'') are reflected on the
backing instance — a pre-existing snapshot-only implementation
silently dropped writes and tripped jinja2''s ``Frame.copy()'' /
``Symbols.copy()'' patterns that depend on this idiom for attribute
forwarding.

Instance variables:
* ``source`` — the PythonInstance this view wraps.
'
%

expectvalue /Class
doit
PyInstanceDict category: 'Grail-Modules'
%

! ------------------- Remove existing methods
expectvalue /Metaclass3
doit
PyInstanceDict removeAllMethods.
PyInstanceDict class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Instance Creation'
classmethod: PyInstanceDict
on: aPythonInstance
	"Construct a live view bound to aPythonInstance.  Writes to the
	view land in the instance's dynamic-instVar storage."

	| inst |
	inst := self @env0:new.
	inst @env0:_setSource: aPythonInstance.
	^ inst
%

category: 'Grail-Private'
method: PyInstanceDict
_setSource: anInstance
	source := anInstance
%

category: 'Grail-Accessing'
method: PyInstanceDict
source
	^ source
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
at: aKey
	"Smalltalk-side keyed read.  Raises if absent — match KeyValueDictionary."

	| val sym |
	sym := aKey @env0:asSymbol.
	val := source @env0:dynamicInstVarAt: sym.
	val @env0:== nil ifTrue: [
		^ source @env0:_errorKeyNotFound: aKey
	].
	^ val
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
at: aKey ifAbsent: aBlock
	"Smalltalk-side keyed read with fallback block."

	| val sym |
	sym := aKey @env0:asSymbol.
	val := source @env0:dynamicInstVarAt: sym.
	val @env0:== nil ifTrue: [^ aBlock @env0:value].
	^ val
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
at: aKey put: aValue
	"Writes propagate to the source instance's dynamic-instVar storage."

	source @env0:dynamicInstVarAt: aKey @env0:asSymbol put: aValue.
	^ aValue
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
includesKey: aKey
	^ (source @env0:dynamicInstVarAt: aKey @env0:asSymbol) @env0:~~ nil
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
keysAndValuesDo: aBlock
	"Iterate (key, value) pairs in declaration order."

	| pairs |
	pairs := source @env0:dynamicInstVarPairs.
	1 @env0:to: pairs @env0:size @env0:by: 2 do: [:i |
		aBlock @env0:value: (pairs @env0:at: i)
			value: (pairs @env0:at: i @env0:+ 1)
	]
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
keys
	"Return the keys as an Array (Smalltalk-side iteration target)."

	| pairs result |
	pairs := source @env0:dynamicInstVarPairs.
	result := Array @env0:new: pairs @env0:size @env0:// 2.
	1 @env0:to: pairs @env0:size @env0:by: 2 do: [:i |
		result @env0:at: (i @env0:+ 1) @env0:// 2 put: (pairs @env0:at: i)
	].
	^ result
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
size
	^ source @env0:dynamicInstVarPairs @env0:size @env0:// 2
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
isEmpty
	^ source @env0:dynamicInstVarPairs @env0:isEmpty
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
notEmpty
	^ source @env0:dynamicInstVarPairs @env0:notEmpty
%

set compile_env: 1

category: 'Grail-Python-Protocol'
method: PyInstanceDict
__getitem__: key
	| val sym |
	sym := key @env0:asSymbol.
	val := source @env0:dynamicInstVarAt: sym.
	val @env0:== nil ifTrue: [
		KeyError @env1:___signal___: key @env0:printString
	].
	^ val
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
__setitem__: key _: value
	source @env0:dynamicInstVarAt: key @env0:asSymbol put: value.
	^ value
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
__contains__: key
	^ (source @env0:dynamicInstVarAt: key @env0:asSymbol) @env0:~~ nil
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
__len__
	^ source @env0:dynamicInstVarPairs @env0:size @env0:// 2
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
get: key
	^ self @env1:get: key _: None
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
get: key _: default
	| val sym |
	sym := key @env0:asSymbol.
	val := source @env0:dynamicInstVarAt: sym.
	val @env0:== nil ifTrue: [^ default].
	^ val
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
keys
	"Python ``dict.keys()'' — return a list of String keys (the
	dynamic-instVar keys are Symbols; we expose them as Python
	``str''s)."

	| pairs result |
	pairs := source @env0:dynamicInstVarPairs.
	result := list ___new___.
	1 @env0:to: pairs @env0:size @env0:by: 2 do: [:i |
		result @env1:append: (pairs @env0:at: i) @env0:asString
	].
	^ result
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
values
	| pairs result |
	pairs := source @env0:dynamicInstVarPairs.
	result := list ___new___.
	1 @env0:to: pairs @env0:size @env0:by: 2 do: [:i |
		result @env1:append: (pairs @env0:at: i @env0:+ 1)
	].
	^ result
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
items
	"Return a list of (key, value) tuples — matches CPython
	``dict.items()'' enough for the ``for k, v in d.items()'' idiom."

	| pairs result |
	pairs := source @env0:dynamicInstVarPairs.
	result := list ___new___.
	1 @env0:to: pairs @env0:size @env0:by: 2 do: [:i |
		result @env1:append: (tuple @env0:withAll:
			{ (pairs @env0:at: i) @env0:asString.
			  (pairs @env0:at: i @env0:+ 1) })
	].
	^ result
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
update: other
	"Copy entries from another mapping into the source instance's
	dynamic-instVar storage.  Accepts a dict / PyInstanceDict / any
	object with keysAndValuesDo: (the Smalltalk-side iteration
	protocol that both classes implement).  Symbol- or String-keyed
	input is normalised to Symbol before storing — instances use
	Symbol keys for dynamicInstVarAt: regardless of caller convention."

	other @env0:keysAndValuesDo: [:k :v |
		source @env0:dynamicInstVarAt: k @env0:asSymbol put: v
	]
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
__iter__
	"Iterating a dict yields its KEYS in Python (the values come from
	indexing).  Match by yielding the dict-keys list's iterator."

	^ self @env1:keys @env1:__iter__
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
__repr__
	"Match Python's dict.__repr__ shape — sufficient for debugging."

	| stream first |
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	stream @env0:nextPutAll: '{'.
	first := true.
	self @env0:keysAndValuesDo: [:k :v |
		first ifFalse: [stream @env0:nextPutAll: ', '].
		first := false.
		stream @env0:nextPutAll: '''';
			nextPutAll: k @env0:asString;
			nextPutAll: ''': '.
		stream @env0:nextPutAll: v @env0:printString
	].
	stream @env0:nextPutAll: '}'.
	^ stream @env0:contents
%

set compile_env: 0
