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
	inst := self new.
	inst _setSource: aPythonInstance.
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
	sym := aKey asSymbol.
	val := source dynamicInstVarAt: sym.
	val == nil ifTrue: [
		^ source _errorKeyNotFound: aKey
	].
	^ val
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
at: aKey ifAbsent: aBlock
	"Smalltalk-side keyed read with fallback block."

	| val sym |
	sym := aKey asSymbol.
	val := source dynamicInstVarAt: sym.
	val == nil ifTrue: [^ aBlock value].
	^ val
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
at: aKey put: aValue
	"Writes propagate to the source instance's dynamic-instVar storage."

	source dynamicInstVarAt: aKey asSymbol put: aValue.
	^ aValue
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
includesKey: aKey
	^ (source dynamicInstVarAt: aKey asSymbol) ~~ nil
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
keysAndValuesDo: aBlock
	"Iterate (key, value) pairs in declaration order."

	| pairs |
	pairs := source dynamicInstVarPairs.
	1 to: pairs size by: 2 do: [:i |
		aBlock value: (pairs at: i)
			value: (pairs at: i + 1)
	]
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
keys
	"Return the keys as an Array (Smalltalk-side iteration target)."

	| pairs result |
	pairs := source dynamicInstVarPairs.
	result := Array new: pairs size // 2.
	1 to: pairs size by: 2 do: [:i |
		result at: (i + 1) // 2 put: (pairs at: i)
	].
	^ result
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
size
	^ source dynamicInstVarPairs size // 2
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
isEmpty
	^ source dynamicInstVarPairs isEmpty
%

category: 'Grail-Smalltalk-Protocol'
method: PyInstanceDict
notEmpty
	^ source dynamicInstVarPairs notEmpty
%

set compile_env: 1

category: 'Grail-Python-Protocol'
method: PyInstanceDict
__getitem__: key
	| val sym |
	sym := key @env0:asSymbol.
	val := source @env0:dynamicInstVarAt: sym.
	val == nil ifTrue: [
		KeyError ___signal___: key @env0:printString
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
	^ (source @env0:dynamicInstVarAt: key @env0:asSymbol) ~~ nil
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
__len__
	^ source @env0:dynamicInstVarPairs @env0:size @env0:// 2
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
get: key
	^ self get: key _: None
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
get: key _: default
	| val sym |
	sym := key @env0:asSymbol.
	val := source @env0:dynamicInstVarAt: sym.
	val == nil ifTrue: [^ default].
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
		result append: (pairs @env0:at: i) @env0:asString
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
		result append: (pairs @env0:at: i @env0:+ 1)
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
		result append: (tuple @env0:withAll:
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
clear
	"Python ``dict.clear()'' — remove every dynamic instVar from the
	source instance (django's LazyObject.__setattr__ resets state with
	``self.__dict__.clear()'')."

	| pairs |
	pairs := source @env0:dynamicInstVarPairs.
	1 @env0:to: pairs @env0:size @env0:by: 2 do: [:i |
		source @env0:removeDynamicInstVar: (pairs @env0:at: i)
	].
	^ None
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
pop: key
	"Python ``dict.pop(k)'' — remove and return; KeyError when absent."

	| sym val |
	sym := key @env0:asSymbol.
	val := source @env0:dynamicInstVarAt: sym.
	val == nil ifTrue: [
		KeyError ___signal___: key @env0:printString
	].
	source @env0:removeDynamicInstVar: sym.
	^ val
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
pop: key _: default
	"Python ``dict.pop(k, default)'' — remove and return, or default."

	| sym val |
	sym := key @env0:asSymbol.
	val := source @env0:dynamicInstVarAt: sym.
	val == nil ifTrue: [^ default].
	source @env0:removeDynamicInstVar: sym.
	^ val
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
setdefault: key
	^ self setdefault: key _: None
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
setdefault: key _: default
	| sym val |
	sym := key @env0:asSymbol.
	val := source @env0:dynamicInstVarAt: sym.
	val == nil ifTrue: [
		source @env0:dynamicInstVarAt: sym put: default.
		^ default
	].
	^ val
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
__iter__
	"Iterating a dict yields its KEYS in Python (the values come from
	indexing).  Match by yielding the dict-keys list's iterator."

	^ self keys __iter__
%

category: 'Grail-Python-Protocol'
method: PyInstanceDict
__reversed__
	"reversed(d) -- keys in reverse insertion order.  Reuse ``keys'' (which
	exposes the dynamic-instVar Symbols as Python ``str''s) so reverse
	iteration yields the SAME string keys as forward ``keys''/``__iter__'';
	collecting raw keysAndValuesDo: keys here would leak Symbols
	(test_dict test_reverse_iterator_for_shared_shared_dicts: reversed(__dict__)
	== ['y', 'x'])."

	^ (self keys @env0:reverse) __iter__
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
		"NO cascade here: a cascade continuation after an @env0: send is
		compiled in the METHOD's environment (env-1) and MNUs on the
		kernel WriteStream."
		stream @env0:nextPutAll: (k __repr__) @env0:asString.
		stream @env0:nextPutAll: ': '.
		stream @env0:nextPutAll: (v __repr__) @env0:asString
	].
	stream @env0:nextPutAll: '}'.
	^ stream @env0:contents
%

set compile_env: 0
