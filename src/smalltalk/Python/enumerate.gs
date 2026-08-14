! ------------------- Superclass check
run
iterator ifNil: [self error: 'iterator is not defined. Check file ordering.'].
%

! ------- enumerate class (Python 'enumerate' type)
expectvalue /Class
doit
iterator subclass: 'enumerate'
  instVarNames: #( source index)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
enumerate comment:
'Python enumerate type: the LAZY iterator returned by enumerate(iterable,
start=0), yielding (index, item) pairs.

A TYPE and not merely a function, as in CPython.  That distinction is
load-bearing rather than cosmetic: ``class MyEnum(enumerate)'' needs a class
to subclass, ``type(enumerate(s)) is enumerate'' is what test_enumerate
checks first, and the pickle round trip has to rebuild the same type.  While
enumerate was a builtins METHOD returning a materialized list_iterator, none
of those held -- and the class statement raised NameError, which is where
test.test_enumerate stopped at import.

Laziness matters for the same reason it does in zip_iterator: the source is
pulled one item at a time, so enumerate(count()) does not hang and an
exception raised by the source''s __next__ surfaces when it is reached
rather than at construction (test_exception_propagation).

Instance variables:
  source - the underlying iterator (already iter()-ed)
  index  - the number to pair with the NEXT item
'
%

expectvalue /Class
doit
enumerate category: 'Grail-Collections-Iterators'
%

expectvalue /Metaclass3
doit
enumerate removeAllMethods: 1.
enumerate class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Instance Creation'
classmethod: enumerate
___construct___: positional kw: kwargs
	"Build an instance of the RECEIVER class over positional/kwargs.

	The receiver rather than ``enumerate'' literally, so a subclass builds
	itself: ``type(MyEnum(seq)) is MyEnum'' is the first thing
	test_enumerate's SubclassTestCase checks.

	The argument rules are CPython's, which test_argumentcheck and test_kwargs
	pin down precisely: either parameter may be given positionally or by
	keyword, in either order; an unknown keyword is an error even when the
	positional arguments are fine; and ``start'' must be an int, so
	``enumerate('abc', 'a')'' fails at the call rather than surprising the
	caller mid-iteration.

	___pyIter___ does the protocol checking, and its errors are already
	CPython's: a non-iterable is ``'X' object is not iterable'' and an
	__iter__ answering a non-iterator is ``iter() returned non-iterator'' --
	exactly what test_noniterable and test_illformediterable expect, raised at
	CONSTRUCTION time, before anything is consumed.  It is the same eager
	validation map/filter/zip use, and for the same reason: PythonInstance
	compiles catchable __iter__/__next__ stubs onto every instance, so a
	getattr-style probe cannot tell a real iterable from an inherited stub."

	| iterable start nargs instance |
	nargs := positional @env0:isNil ifTrue: [0] ifFalse: [positional @env0:size].
	nargs @env0:> 2 ifTrue: [
		^ TypeError ___signal___: 'enumerate() takes at most 2 arguments ('
			@env0:, nargs @env0:printString @env0:, ' given)'].

	iterable := nargs @env0:>= 1 ifTrue: [positional @env0:at: 1] ifFalse: [nil].
	start := nargs @env0:>= 2 ifTrue: [positional @env0:at: 2] ifFalse: [nil].
	(kwargs @env0:isNil or: [kwargs @env0:isEmpty]) ifFalse: [
		kwargs @env0:keysDo: [:k | | key |
			key := k @env0:asString.
			key @env0:= 'iterable'
				ifTrue: [
					iterable @env0:isNil ifFalse: [
						^ TypeError ___signal___: 'enumerate() got multiple '
							@env0:, 'values for argument ''iterable'''].
					iterable := kwargs @env0:at: k]
				ifFalse: [
					key @env0:= 'start'
						ifTrue: [
							start @env0:isNil ifFalse: [
								^ TypeError ___signal___: 'enumerate() got multiple '
									@env0:, 'values for argument ''start'''].
							start := kwargs @env0:at: k]
						ifFalse: [
							^ TypeError ___signal___: '''' @env0:, key
								@env0:, ''' is an invalid keyword argument for '
								@env0:, 'enumerate()']]]].
	iterable @env0:isNil ifTrue: [
		^ TypeError ___signal___:
			'enumerate() missing required argument ''iterable'''].
	start @env0:isNil ifTrue: [start := 0].
	"``start'' counts, so it must be an integer.  bool IS an int in Python and
	is deliberately accepted; a str is the case test_argumentcheck names."
	((start @env0:isKindOf: Integer) or: [start @env0:isKindOf: Boolean]) ifFalse: [
		^ TypeError ___signal___: '''' @env0:, (start ___pyTypeNameForError___)
			@env0:, ''' object cannot be interpreted as an integer'].
	instance := self ___new___.
	instance ___setSource: ((builtins @env0:___instance___)
		___pyIter___: iterable) start: start.
	^ instance
%

category: 'Grail-Instance Creation'
classmethod: enumerate
__new__
	"CPython gives enumerate a tp_new rather than an __init__, and so does
	this.  The fixed-arity forms exist because CallAst's class-call fast path
	names its selector by ARITY (``__new__'', ``__new__:'', ``__new__:_:'');
	without them the call resolved to the inherited ``object class >> __new__:
	cls'', which reads its argument as the class to allocate -- so
	``enumerate('ab')'' sent #new to the string."

	^ self ___construct___: #() kw: nil
%

category: 'Grail-Instance Creation'
classmethod: enumerate
__new__: anIterable
	^ self ___construct___: { anIterable } kw: nil
%

category: 'Grail-Instance Creation'
classmethod: enumerate
__new__: anIterable _: aStart
	^ self ___construct___: { anIterable. aStart } kw: nil
%

category: 'Grail-Instance Creation'
classmethod: enumerate
__new__: anIterable _: aStart _: extra
	"One arity PAST the maximum, so the too-many-arguments case reports
	CPython's message rather than the generic ``no matching method'' the
	class-call fallback produces for an unresolved selector.  Beyond three the
	fallback still answers -- a TypeError either way, just less specific."

	^ self ___construct___: { anIterable. aStart. extra } kw: nil
%

category: 'Grail-Instance Creation'
classmethod: enumerate
_new: positional kw: kwargs
	"The KEYWORD-bearing route for a BUILT-IN class.  CallAst's fixed-arity
	fast path declines when the call site has keywords, so ``enumerate(start=1,
	iterable=s)'' arrives as ``enumerate value: {} value: kw'' and object
	class >> value:value: forwards it here."

	^ self ___construct___: positional kw: kwargs
%

category: 'Grail-Instance Creation'
method: enumerate
___new__: positional kw: kwargs
	"The KEYWORD-bearing route.  CallAst's fixed-arity fast path declines when
	the call site has keywords, so those arrive through
	___allocateInstance___:kw: -- which looks for this varargs ``__new__'' on
	the instance side and invokes it with the CLASS as receiver, the same
	convention a Python ``def __new__(cls, ...)'' compiles to.  ``self'' is
	therefore the class here, which is what makes a subclass build itself."

	^ self ___construct___: positional kw: kwargs
%

category: 'Grail-Private'
method: enumerate
___setSource: anIterator start: aStart
	source := anIterator.
	index := aStart
%

category: 'Grail-Iterator Protocol'
method: enumerate
__next__
	"The next (index, item) pair.  StopIteration from the source ends the
	enumeration; every other exception propagates untouched, which is what
	makes a source whose __next__ divides by zero raise ZeroDivisionError
	rather than stopping quietly."

	| item pair |
	item := source __next__.
	pair := tuple @env0:withAll: { index. item }.
	index := index @env0:+ 1.
	^ pair
%

category: 'Grail-Pickle Support'
method: enumerate
__reduce__
	"CPython''s enum_reduce: ``(type(self), (source_iterator, index))''.

	Named by TYPE rather than reduced to a plain iterator, so a subclass comes
	back as itself -- test_enumerate''s check_pickle asserts
	``type(itorg) == type(it)'' and then resumes the copy, which the surviving
	index is what makes possible.

	Reconstruction re-enters the 2-argument form with the SOURCE ITERATOR as
	the iterable; iter() answers an iterator unchanged, so the partially
	consumed position is preserved."

	^ tuple @env0:withAll: {
		self @env0:class.
		tuple @env0:withAll: { source. index } }
%

category: 'Grail-Iterator Protocol'
method: enumerate
__length_hint__
	"What the source has left, when it can say.  operator.length_hint falls
	back to 0 for a source that cannot, which is also CPython''s answer for an
	enumerate over an unsized iterator."

	(source ___respondsTo___: #'__length_hint__') ifTrue: [
		^ source __length_hint__].
	^ 0
%

set compile_env: 0
