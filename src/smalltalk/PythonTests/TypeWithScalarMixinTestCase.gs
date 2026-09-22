! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TypeWithScalarMixinTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TypeWithScalarMixinTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
TypeWithScalarMixinTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TypeWithScalarMixinTestCase
!
! ``type(name, bases, ns)'' over a scalar built-in -- FOUR separate defects, all
! reachable from one line of test_builtin:
!
!     C = type('C', (B, int), {'spam': lambda self: 'spam%s' % self})
!
! CONSTRUCTION DIED UNCATCHABLY.  Grail's builtin ``__new__:'' classmethods take
! the VALUE and no cls, while the generic path PREPENDS the class as CPython's
! implicit-staticmethod ``cls'' -- and the scalar roots declare no ``__new__:''
! of their own, so it resolved to ``object class >> __new__: cls'', which treats
! its argument as the class to instantiate.  ``type('D', (int,), {})(7)'' became
! ``7 new'', a Smalltalk MessageNotUnderstood no Python except can see.
!
! A class STATEMENT never reaches that path -- ClassDefAst's firstBaseIsX branch
! constructs directly -- which is why the common spelling worked and the dynamic
! one crashed, and why this survived so long.  The fix delegates to
! ___allocateInstance___ rather than restating it: that is the method that knows
! how to reach an INSTANCE-side ``___new__:kw:'' whose ``self'' is the class,
! through UnboundMethod, since a plain send from a class receiver lands on the
! metaclass instead.
!
! __base__ REPORTED AN INTERNAL CLASS.  It answered the Smalltalk superclass, and
! a Grail subclass of int is rooted at AbstractPyInt (Integer is sealed and its
! instances have no room for instance variables), of str at Unicode32 (the
! widened base a subclass needs to hold any code point).  So
! ``D.__base__ is int'' was False while its repr read ``<class 'int'>'' -- the
! worst way for a value to be wrong.  __bases__ and __mro__ already launder these
! roots; __base__ did not, so the three disagreed about the same class.  It now
! reads the MI registry for a declared base list, as __bases__ does, and picks
! the SOLID base -- the one whose storage the class carries.
!
! __dict__ HELD METHODS THE CLASS DOES NOT OWN.  Grail is single-inheritance
! underneath, so ___mergeSecondaryBases___ COPIES the other bases' methods onto
! the class, which makes them indistinguishable from its own by method dictionary
! alone.  The merge files them under its own CATEGORY, so the class already
! records which they are -- no new bookkeeping, and it cannot drift from the
! merge because the merge is what writes it.  Grail's own ``___name___'' /
! ``___qualname___'' leaked too: the method walks excluded ``___...___'' and the
! per-class attribute holder did not.
!
! int.to_bytes ANSWERED A TUPLE.  ``(42).to_bytes(2, 'little')'' gave ``(42, 0)''
! where CPython gives ``b'*\x00''' -- the same numbers, the wrong type, and a
! wrong type that prints plausibly enough to travel a long way before failing.
!
! And an int SUBCLASS could not reach it at all.  AbstractPyInt forwards an
! unknown attribute to the wrapped value, and the probe asked for the UNARY
! selector only: ``to_bytes'' is filed as ``to_bytes:_:'', so every no-argument
! method forwarded and every other one raised AttributeError for a method sitting
! right there.  A suite half of which forwards is worse than one that does not,
! because the half that works hides the half that does not.
!
! Drives tests/python/type_with_scalar_mixin.py, whose EXPECTED table was
! measured by RUNNING CPython 3.14.6.
!
! test_builtin's TestType.test_new_type.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TypeWithScalarMixinTestCase removeAllMethods.
TypeWithScalarMixinTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: TypeWithScalarMixinTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'type_with_scalar_mixin' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/type_with_scalar_mixin.py')
		name: 'type_with_scalar_mixin'.
%

category: 'Grail-Private'
method: TypeWithScalarMixinTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - construction'
method: TypeWithScalarMixinTestCase
testAScalarMixinConstructs
	"It ended the session: ``7 new'', a Smalltalk MessageNotUnderstood that no
	Python except can see."

	self assertMatchesCPythonAt: 'construct_with_value'.
	self assertMatchesCPythonAt: 'construct_empty'.
	self assertMatchesCPythonAt: 'construct_single_base'.
	self assertMatchesCPythonAt: 'type_of_instance'.
	self assertMatchesCPythonAt: 'equals_its_value'.
%

category: 'Grail-Tests - construction'
method: TypeWithScalarMixinTestCase
testItKeepsEveryBasesMethods
	"Its own, the merged secondary base's, and the scalar root's."

	self assertMatchesCPythonAt: 'own_method'.
	self assertMatchesCPythonAt: 'merged_base_method'.
	self assertMatchesCPythonAt: 'scalar_method'.
%

category: 'Grail-Tests - __base__'
method: TypeWithScalarMixinTestCase
testBaseIsTheSolidBaseNotTheSubstitute
	"``D.__base__ is int'' was False while its repr read ``<class 'int'>'':
	the Smalltalk superclass is AbstractPyInt, whose Python name is ``int''
	and which is not int.  __bases__ and __mro__ already hid the roots, so
	the three disagreed about the same class."

	self assertMatchesCPythonAt: 'base_of_mixin'.
	self assertMatchesCPythonAt: 'base_of_int_subclass'.
	self assertMatchesCPythonAt: 'base_of_str_subclass'.
	self assertMatchesCPythonAt: 'bases_tuple'.
%

category: 'Grail-Tests - __dict__'
method: TypeWithScalarMixinTestCase
testTheDictHoldsOnlyWhatTheClassOwns
	"A merged secondary base's method is compiled ONTO the class, so the
	method dictionary alone cannot tell it from the class's own -- the merge's
	own category can.  And Grail's internal names leaked because the method
	walks excluded them and the attribute holder did not."

	self assertMatchesCPythonAt: 'own_name_in_dict'.
	self assertMatchesCPythonAt: 'merged_name_not_in_dict'.
	self assertMatchesCPythonAt: 'no_internal_names'.
	self assertMatchesCPythonAt: 'firstlineno_absent'.
%

category: 'Grail-Tests - to_bytes'
method: TypeWithScalarMixinTestCase
testToBytesAnswersBytes
	"It built a TUPLE of the byte values: the same numbers, the wrong type,
	and a wrong type that prints plausibly."

	self assertMatchesCPythonAt: 'to_bytes_plain'.
	self assertMatchesCPythonAt: 'to_bytes_big'.
	self assertMatchesCPythonAt: 'from_bytes_roundtrip'.
%

category: 'Grail-Tests - to_bytes'
method: TypeWithScalarMixinTestCase
testASubclassReachesItAtEveryArity
	"The forwarding probe asked for the UNARY selector only, so every
	no-argument method forwarded and every other raised AttributeError for a
	method sitting right there.  A suite half of which forwards is worse than
	one that does not."

	self assertMatchesCPythonAt: 'to_bytes_on_mixin'.
	self assertMatchesCPythonAt: 'to_bytes_on_statement_sub'.
%

category: 'Grail-Tests - Controls'
method: TypeWithScalarMixinTestCase
testTheOrdinaryShapesAreUnchanged
	"A class STATEMENT subclass never took the broken construction path and
	must not start; a plain class's __dict__ and __base__ are untouched; and
	the unary methods that already forwarded still do."

	self assertMatchesCPythonAt: 'statement_subclass_value'.
	self assertMatchesCPythonAt: 'statement_subclass_unary'.
	self assertMatchesCPythonAt: 'str_subclass_value'.
	self assertMatchesCPythonAt: 'plain_class_dict'.
	self assertMatchesCPythonAt: 'plain_instance'.
	self assertMatchesCPythonAt: 'base_of_plain'.
	self assertMatchesCPythonAt: 'base_of_bare'.
	self assertMatchesCPythonAt: 'isinstance_of_int'.
%

category: 'Grail-Tests - Controls'
method: TypeWithScalarMixinTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '29 checks, 0 disagreeing [], keys match: True'
%
