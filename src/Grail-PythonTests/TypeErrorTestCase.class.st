Class {
	#name : 'TypeErrorTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-TypeError' }
TypeErrorTestCase >> loadBinOpFixture [
	"Load tests/python/binop_operand_typeerror.py fresh."

	importlib @env1:modules removeKey: #'binop_operand_typeerror' ifAbsent: [].
	^ importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/binop_operand_typeerror.py')
		name: 'binop_operand_typeerror'

]

{ #category : 'Grail-Tests-TypeError' }
TypeErrorTestCase >> loadSubscriptFixture [
	"Load tests/python/subscript_typeerror.py fresh."

	importlib @env1:modules removeKey: #'subscript_typeerror' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/subscript_typeerror.py')
		name: 'subscript_typeerror'

]

{ #category : 'Grail-Tests-TypeError' }
TypeErrorTestCase >> test_creation [
	"Test creating a TypeError instance."
	
	| exc |
	exc := TypeError ___new___:  TypeError .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests-TypeError' }
TypeErrorTestCase >> test_inheritance [
	"Test that TypeError inherits from Exception."
	
	| exc |
	exc := TypeError ___new___:  TypeError .
	self assert: (exc isKindOf: Exception).

]

{ #category : 'Grail-Tests-TypeError' }
TypeErrorTestCase >> testARealGetitemIsNotShadowedByTheFallback [
	"NEGATIVE CONTROL.  A fallback that fired too eagerly would satisfy every
	check above and still be wrong.  A class that HAS __getitem__ must answer
	its own value, and an exception raised by that __getitem__ must surface
	unchanged rather than being repainted as a TypeError."

	| mod |
	mod := self loadSubscriptFixture.
	self assert: (mod @env1:neg_real_getitem_wins) equals: '(''got'', 3)'.
	self assert: (mod @env1:neg_real_getitem_raises_its_own)
		equals: 'KeyError: ''missing'''.
	self assert: (mod @env1:neg_real_setitem_and_delitem)
		equals: '(''v'', False)'

]

{ #category : 'Grail-Tests-TypeError' }
TypeErrorTestCase >> testBareObjectSubscriptIsACatchableTypeError [

	self
		assert: (self loadSubscriptFixture @env1:read_object)
		equals: 'TypeError: ''object'' object is not subscriptable'

]

{ #category : 'Grail-Tests-TypeError' }
TypeErrorTestCase >> testBinOpErrorsNameThePythonTypeNotTheSmalltalkOne [
	"The headline rows, named on their own so a failure says which one.  The
	last two are the same int and the same message with the operand a
	LargePositiveInteger rather than a SmallInteger -- the pair that showed
	the old names were not even stable for one Python type."

	| mod |
	mod := self loadBinOpFixture.
	self assert: (mod @env1:plain_plus_smallint)
		equals: 'TypeError: unsupported operand type(s) for +: ''P'' and ''int'''.
	self assert: (mod @env1:plain_plus_float)
		equals: 'TypeError: unsupported operand type(s) for +: ''P'' and ''float'''.
	self assert: (mod @env1:plain_plus_str)
		equals: 'TypeError: unsupported operand type(s) for +: ''P'' and ''str'''.
	self assert: (mod @env1:object_plus_float)
		equals: 'TypeError: unsupported operand type(s) for +: ''object'' and ''float'''.
	self assert: (mod @env1:plain_plus_largeint)
		equals: 'TypeError: unsupported operand type(s) for +: ''P'' and ''int'''

]

{ #category : 'Grail-Tests-TypeError' }
TypeErrorTestCase >> testBoolSubscriptIsACatchableTypeError [

	self
		assert: (self loadSubscriptFixture @env1:read_bool)
		equals: 'TypeError: ''bool'' object is not subscriptable'

]

{ #category : 'Grail-Tests-TypeError' }
TypeErrorTestCase >> testEveryBinOpOperandNameMatchesCPython [
	"The whole swept matrix in one assertion -- eleven right-hand built-ins,
	four left-hand ones, nine operators, both fallback directions, and a
	positive control that working arithmetic still works.

	Reported as ROWS, not a count: the leaked name a check actually got is
	the whole diagnosis.  The count is asserted separately, because ``no
	failures'' out of an empty table is a well-formed number describing
	nothing."

	| mod |
	mod := self loadBinOpFixture.
	self assert: (mod @env1:check_count) > 25.
	self assert: (mod @env1:failures) equals: ''

]

{ #category : 'Grail-Tests-TypeError' }
TypeErrorTestCase >> testEverySubscriptShapeMatchesCPython [
	"The whole swept matrix in one assertion -- read, assign and delete across
	int / float / bool / complex / None / object() / a plain instance / set /
	frozenset / ellipsis, plus str, bytes, tuple and range for the assignment
	and deletion wordings, plus positive and negative controls.

	Reported as ROWS, not a count: the value a check actually got is the whole
	diagnosis.  The count is asserted separately, because ``no failures'' out
	of an empty table is a well-formed number describing nothing."

	| mod |
	mod := self loadSubscriptFixture.
	self assert: (mod @env1:check_count) > 40.
	self assert: (mod @env1:failures) equals: ''

]

{ #category : 'Grail-Tests-TypeError' }
TypeErrorTestCase >> testFloatSubscriptIsACatchableTypeError [
	"The headline shape, named on its own so a failure says which one."

	self
		assert: (self loadSubscriptFixture @env1:slice_float)
		equals: 'TypeError: ''float'' object is not subscriptable'

]

{ #category : 'Grail-Tests-TypeError' }
TypeErrorTestCase >> testItemErrorsNameThePythonTypeNotTheSmalltalkOne [
	"``x[0] = 1'' on a float said ``'SmallDouble' object does not support item
	assignment'' -- the Smalltalk class behind the built-in, leaked into a
	Python error message.  Named through type(x).__name__ now, which Grail
	already answers correctly for every built-in, so this is derived rather
	than a second table to keep in step with the first."

	| mod |
	mod := self loadSubscriptFixture.
	self assert: (mod @env1:set_float)
		equals: 'TypeError: ''float'' object does not support item assignment'.
	self assert: (mod @env1:set_int)
		equals: 'TypeError: ''int'' object does not support item assignment'.
	self assert: (mod @env1:set_str)
		equals: 'TypeError: ''str'' object does not support item assignment'.
	self assert: (mod @env1:set_range)
		equals: 'TypeError: ''range'' object does not support item assignment'.
	self assert: (mod @env1:del_bytes)
		equals: 'TypeError: ''bytes'' object doesn''t support item deletion'

]

{ #category : 'Grail-Tests-TypeError' }
TypeErrorTestCase >> testOperandNamesAreInSourceOrder [
	"The message names the operands as the source wrote them, so the
	int-on-the-left form must not come back reversed by the fallback's own
	self/other naming."

	| mod |
	mod := self loadBinOpFixture.
	self assert: (mod @env1:int_plus_plain)
		equals: 'TypeError: unsupported operand type(s) for +: ''int'' and ''P'''.
	self assert: (mod @env1:float_plus_plain)
		equals: 'TypeError: unsupported operand type(s) for +: ''float'' and ''P'''

]

{ #category : 'Grail-Tests-TypeError' }
TypeErrorTestCase >> testReverseBinOpFallbackAlsoNamesPythonTypes [
	"``___rbinOpFallback___'' carried the identical leak.  The Python shape
	that reaches it is a class whose forward __add__ returns NotImplemented:
	the reflected slot on the int then runs and refuses."

	self
		assert: (self loadBinOpFixture @env1:declined_plus_int)
		equals: 'TypeError: unsupported operand type(s) for +: '
			, '''NotImplementedAdd'' and ''int'''

]

{ #category : 'Grail-Tests-TypeError' }
TypeErrorTestCase >> testSetSubscriptIsACatchableTypeError [

	self
		assert: (self loadSubscriptFixture @env1:read_set)
		equals: 'TypeError: ''set'' object is not subscriptable'

]

{ #category : 'Grail-Tests-TypeError' }
TypeErrorTestCase >> testSlicingAFloatInsideTryExceptIsCaught [
	"The real-world blocker: kaggle_models_extended.py:231 slices a value that
	turns out to be a float, inside ``try: ... except: pass''.  CPython catches
	it and moves on; Grail died before reaching the handler."

	self
		assert: (self loadSubscriptFixture @env1:kaggle_shape)
		equals: 'caught'

]

{ #category : 'Grail-Tests-TypeError' }
TypeErrorTestCase >> testStrReflectedModDeclinesInsteadOfKillingTheProcess [
	"``Decimal('2') % 'a''' -- and ``P() % 'a''' for any class with no __mod__
	-- reached CharacterCollection >> __rmod__:, which was
	``self error: 'Not yet implemented: __rmod__'''.  A raw Smalltalk error is
	invisible to Python's ``except'', so the expression did not raise: it
	printed that text and terminated the process (measured: rc=1, and the
	statement after the try/except never ran).

	CPython's str.__rmod__ answers NotImplemented for a non-string left
	operand, so the conformant answer is also the catchable one -- the
	ordinary unsupported-operand TypeError, with the operand names this
	change fixed.  Printf-style formatting for a STRING left operand is a
	real feature and is NOT what was missing; str.__mod__ already implements
	it, and __rmod__: now delegates there.

	A regression here does not make this test FAIL, it makes the whole shard
	die, which is the louder signal."

	self
		assert: (self loadBinOpFixture @env1:plain_mod_str)
		equals: 'TypeError: unsupported operand type(s) for %: ''P'' and ''str'''

]

{ #category : 'Grail-Tests-TypeError' }
TypeErrorTestCase >> testSubscriptingThatShouldWorkStillWorks [
	"The other direction: list / tuple / str / bytes / dict / bytearray / range
	read, slice, assign and delete exactly as before."

	| mod |
	mod := self loadSubscriptFixture.
	self assert: (mod @env1:pos_list) equals: '[2, [2, 3], 9, 2]'.
	self assert: (mod @env1:pos_tuple) equals: '(2, (2, 3))'.
	self assert: (mod @env1:pos_str) equals: '(''b'', ''bc'')'.
	self assert: (mod @env1:pos_bytes) equals: '(98, b''bc'')'.
	self assert: (mod @env1:pos_dict) equals: '(''a'', ''z'', False)'.
	self assert: (mod @env1:pos_bytearray) equals: '(98, 9, False)'.
	self assert: (mod @env1:pos_range) equals: '(1, range(1, 3))'

]

{ #category : 'Grail-Tests-TypeError' }
TypeErrorTestCase >> testTheFallbackDoesNotInventAGetitemAttribute [
	"NEGATIVE CONTROL, and the discriminator between the two ways this fix
	could have been written.  A real ``object >> __getitem__:'' would make
	``hasattr(x, '__getitem__')'' answer true for every object alive -- CPython
	says false -- and every ownership probe in the tree would then have to
	unlearn it.  A dispatch-failure fallback leaves attribute lookup exactly as
	it was: object(), set and frozenset, the receivers this change newly
	covers, still report no __getitem__ attribute at all.

	float and bool are deliberately not probed here; Grail already answers true
	for them because an instance attribute load reaches the CLASS-side
	__getitem__: Subscript.gs installs on Float/Integer/Boolean.  That leak
	predates this change and is recorded in docs/Issues.md -- probing it would
	make this control fail for a reason it is not about.

	The fourth element is the control for the other direction: a class that
	really has one still reports it."

	self
		assert: (self loadSubscriptFixture @env1:neg_no_phantom_getitem_attribute)
		equals: '(False, False, False, True)'

]
