! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClosureAttributeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClosureAttributeTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClosureAttributeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClosureAttributeTestCase
!
! Regression: dynamic attribute storage on ExecBlock (Smalltalk closures
! returned as Python ``def'' values).  GemStone's primitive ExecBlock has
! no varying instVars, so the default Object>>__setattr__ path raises an
! ImproperOperation.  An ExecBlockAttrs side-table (IdentityKeyValueDictionary
! keyed by block identity) brokers the storage so ``block.attr = value''
! round-trips through a subsequent ``block.attr'' read — needed by jinja2's
! ``@async_variant'' decorator which stamps ``wrapper.jinja_async_variant
! = True'' on the closure it returns.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClosureAttributeTestCase removeAllMethods.
ClosureAttributeTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - ExecBlock Attributes'
method: ClosureAttributeTestCase
testSetattrAndGetattrRoundTrip
	"``b.foo = 42'' then ``b.foo'' returns 42.  Direct Smalltalk
	test of the ExecBlock __setattr__:_: / __getattr__: pair."

	| block |
	block := [:x | x @env0:+ 1].
	block @env1:__setattr__: 'foo' _: 42.
	self assert: (block @env1:__getattr__: 'foo') equals: 42
%

category: 'Grail-Tests - ExecBlock Attributes'
method: ClosureAttributeTestCase
testGetattrOnUnsetAttrRaisesAttributeError
	"``block.never_set'' raises AttributeError when no prior write
	created the slot.  Matches CPython's object.__getattr__ fallback."

	| block raised |
	block := [:x | x].
	raised := false.
	[block @env1:__getattr__: 'never_set']
		@env0:on: AttributeError
		do: [:ex | raised := true].
	self assert: raised
%

category: 'Grail-Tests - ExecBlock Attributes'
method: ClosureAttributeTestCase
testSetattrOverwritesExistingValue
	"Re-setting the same name replaces the stored value."

	| block |
	block := [].
	block @env1:__setattr__: 'tag' _: 'first'.
	block @env1:__setattr__: 'tag' _: 'second'.
	self assert: (block @env1:__getattr__: 'tag') equals: 'second'
%

category: 'Grail-Tests - ExecBlock Attributes'
method: ClosureAttributeTestCase
testAttributesAreIdentityScoped
	"Two distinct blocks have independent attribute storage.
	Identity-keyed table means ``block_a.tag = 1'' does not leak
	into ``block_b.tag''."

	| blockA blockB raised |
	blockA := [].
	blockB := [].
	blockA @env1:__setattr__: 'tag' _: 'A'.
	raised := false.
	[blockB @env1:__getattr__: 'tag']
		@env0:on: AttributeError
		do: [:ex | raised := true].
	self assert: raised.
	self assert: (blockA @env1:__getattr__: 'tag') equals: 'A'
%

category: 'Grail-Tests - ExecBlock Attributes'
method: ClosureAttributeTestCase
testNameFallsBackToPlaceholder
	"``block.__name__'' returns ``<closure>'' when no decorator
	has stamped a name.  Required so ``@app.route'' / functools.wraps
	can read the attribute without crashing on a bare closure."

	self assert: ([] @env1:__name__) equals: '<closure>'.
	self assert: ([] @env1:__qualname__) equals: '<closure>'.
	self assert: ([] @env1:__module__) equals: '<closure>'
%

category: 'Grail-Tests - ExecBlock Attributes'
method: ClosureAttributeTestCase
testNameRespectsExplicitStamp
	"A ``__setattr__: '__name__''' write wins over the placeholder
	fallback — decorators that copy the wrapped function's name
	(functools.wraps) round-trip the stamp."

	| block |
	block := [].
	block @env1:__setattr__: '__name__' _: 'view_func'.
	self assert: (block @env1:__name__) equals: 'view_func'
%
