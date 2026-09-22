! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ModuleAttrDeleteTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ModuleAttrDeleteTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ModuleAttrDeleteTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ModuleAttrDeleteTestCase
!
! ``del m.x'' has to remove the name WHEREVER the module keeps it, and a module
! keeps its globals in THREE places: dynamic instVars (what a Python module body
! assigns), dictionary entries (built-in module data), and lazily-wrapped class
! METHODS -- because a module written in Smalltalk, sys among them, has its
! functions and its streams compiled as methods.
!
! Only the first two can be removed.  Unfiling the third is not an option: the
! method is shared by every session and every other module in the image.  So
! deleting a method-backed name did the worst thing a delete can do -- it
! reported success and left the attribute exactly where it was.
!
! WORSE, AND THE SHAPE THAT TOOK LONGEST TO SEE: a module body that ASSIGNS over
! a built-in name creates a dynamic instVar SHADOWING the method.  Deleting that
! removed the shadow and REVEALED the method underneath, so
!
!     sys.stdout = f
!     del sys.stdout
!
! quietly restored the ORIGINAL stdout and answered None.  The caller was told
! the delete worked, twice over.  That is why the tombstone is recorded
! unconditionally rather than only when the stores had nothing.
!
! A TOMBSTONE is the only way to make a method-backed name absent.  Session-local
! deliberately: a Grail module is a PERSISTENT object, so removing a built-in
! attribute for good would outlive the program that did it, while CPython's del
! touches one process's module and nothing else.
!
! REVIVING IT IS THE HALF THAT NEEDED THREE TRIES, and the lesson is the useful
! part.  Ordering the tombstone check AFTER the dynamic-instVar probe looks like
! it makes an assignment revive the name -- and does not, because ``m.x = v''
! does not always store where the read looks: sys.stdout has a compiled accessor
! PAIR, so assigning it performs the setter and writes NEITHER store.  Clearing
! the mark on the STORE is the only version that cannot be wrong.  And the store
! a module assignment actually makes is ``__setattr__'', not
! ``___pyAttrStore___'' -- hooking only the latter left the name still deleted
! after it had been assigned.
!
! TWO READ CHAINS have to respect it, which is the other thing easy to miss:
! module >> ___globalAt___ serves bare names and globals(), and object >>
! ___pyAttrLoad___'s module branch serves ``m.x''.  They are separate walks over
! the same three homes.
!
! WHAT IT IS FOR: input() raises ``RuntimeError: lost sys.stdout'' once the
! stream is gone, which it could not do while the delete was a no-op.  Grail
! keys that on DELETED rather than on None, because it INITIALISES sys.stdin and
! sys.stdout to None and reads the console through its own provider when they
! are -- so ``None means lost'' would refuse every ordinary interactive input().
! The ordinary_input_unaffected row is that control.
!
! Drives tests/python/module_attr_delete.py, whose EXPECTED table was measured by
! RUNNING CPython 3.14.6.
!
! test_builtin's test_input.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ModuleAttrDeleteTestCase removeAllMethods.
ModuleAttrDeleteTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ModuleAttrDeleteTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'module_attr_delete' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_attr_delete.py')
		name: 'module_attr_delete'.
%

category: 'Grail-Private'
method: ModuleAttrDeleteTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - the delete takes effect'
method: ModuleAttrDeleteTestCase
testAMethodBackedAttributeReallyGoes
	"It used to report success and leave the attribute there.  Both
	enumerations and the read agree it is gone, and the AttributeError says
	so in CPython's words."

	self assertMatchesCPythonAt: 'gone_from_hasattr_and_dir'.
	self assertMatchesCPythonAt: 'reading_it_raises'.
%

category: 'Grail-Tests - the delete takes effect'
method: ModuleAttrDeleteTestCase
testAssignmentRevivesIt
	"The half that needed three tries.  An assignment does not always store
	where the read looks -- sys.stdout has an accessor PAIR, so assigning it
	performs the setter and writes neither store -- so the mark is cleared on
	the STORE rather than ordered around in the read.  And the store a module
	assignment makes is __setattr__, not ___pyAttrStore___."

	self assertMatchesCPythonAt: 'assignment_revives_it'.
%

category: 'Grail-Tests - what it is for'
method: ModuleAttrDeleteTestCase
testInputRefusesOnceAStreamIsGone
	"CPython's ``RuntimeError: lost sys.stdout''.  input() could not raise it
	while the delete was a no-op: the stream was still there."

	self assertMatchesCPythonAt: 'input_lost_stdout'.
	self assertMatchesCPythonAt: 'input_lost_stdin'.
	self assertMatchesCPythonAt: 'input_after_reviving'.
%

category: 'Grail-Tests - Controls'
method: ModuleAttrDeleteTestCase
testOrdinaryInputIsUnaffected
	"THE CONTROL FOR THE GUARD'S KEY.  Grail initialises sys.stdin and
	sys.stdout to None and reads the console through its own provider when
	they are, so keying ``lost'' on None -- which is what CPython does --
	would refuse every ordinary interactive input().  It keys on DELETED."

	self assertMatchesCPythonAt: 'ordinary_input_unaffected'.
%

category: 'Grail-Tests - Controls'
method: ModuleAttrDeleteTestCase
testTheOtherDeleteShapesAreUnchanged
	"A name that was never there is still refused, an ordinary value
	attribute still deletes and comes back, and the module still works
	afterwards -- the tombstone is per name, not a flag on the module."

	self assertMatchesCPythonAt: 'delete_missing_name'.
	self assertMatchesCPythonAt: 'delete_a_value_attribute'.
	self assertMatchesCPythonAt: 'module_still_usable'.
%

category: 'Grail-Tests - Controls'
method: ModuleAttrDeleteTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '10 checks, 0 disagreeing [], keys match: True'
%
