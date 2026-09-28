! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for StructBuffersAndHalfInitTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'StructBuffersAndHalfInitTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
StructBuffersAndHalfInitTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! StructBuffersAndHalfInitTestCase - what test.test_struct found missing
! ===============================================================================
!   * array view  -- memoryview over an array.array was read-only
!                    (memoryview class >> ___isReadOnly___:), and a write had no
!                    way into a source whose bytes are a copy; it now goes
!                    through the array's ``_grail_set_byte'' hook.
!   * strides     -- a stepped slice raised NotImplementedError; it is a real
!                    non-contiguous view now (memoryview >> ___sliceView___:),
!                    which pack_into and cast refuse as CPython's do.
!   * pack_into   -- accepted a list, because it asked only for __setitem__
!                    (struct >> ___isWritableBuffer___:).
!   * half-init   -- ``Struct.__new__(Struct)'' read the class as a format
!                    string; it is an uninitialized Struct whose every operation
!                    raises RuntimeError and whose size is -1.
!   * iterator    -- iter_unpack answered the list's iterator, a constructible
!                    type; unpack_iterator is not.
!   * fresh       -- import_fresh_module left its module pinned (sys.modules, the
!                    canonical registry, the module-singleton registry); a module
!                    not yet imported is now built session-local and let go
!                    (grail >> _begin_fresh_import: / _end_fresh_import:).
!
! tests/python/struct_buffers_and_half_init.py holds the 9 checks, run under
! real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
StructBuffersAndHalfInitTestCase removeAllMethods.
StructBuffersAndHalfInitTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: StructBuffersAndHalfInitTestCase
setUp

	importlib @env1:modules removeKey: #'struct_buffers_and_half_init' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/struct_buffers_and_half_init.py')
		name: 'struct_buffers_and_half_init'
%

category: 'Grail-Helpers'
method: StructBuffersAndHalfInitTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: StructBuffersAndHalfInitTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - memoryview'
method: StructBuffersAndHalfInitTestCase
testAViewOverAnArrayIsWritable

	self assertAll: #('a_view_over_an_array_is_writable_through')
%

category: 'Grail-Tests - memoryview'
method: StructBuffersAndHalfInitTestCase
testSteppedSlicesAreRealViews

	self assertAll: #('stepped_slices_read_through_their_stride'
		'a_stepped_view_writes_through_and_composes'
		'a_stepped_view_is_not_castable_and_step_zero_is_refused')
%

category: 'Grail-Tests - struct'
method: StructBuffersAndHalfInitTestCase
testPackIntoWantsAWritableBuffer

	self assertAll: #('pack_into_refuses_anything_that_is_not_a_writable_buffer')
%

category: 'Grail-Tests - struct'
method: StructBuffersAndHalfInitTestCase
testAHalfInitializedStruct

	self assertAll: #('a_half_initialized_struct_refuses_every_operation'
		'a_half_initialized_struct_can_be_initialized_later')
%

category: 'Grail-Tests - struct'
method: StructBuffersAndHalfInitTestCase
testIterUnpackAnswersAnUnpackIterator

	self assertAll: #('iter_unpack_answers_an_uninstantiable_unpack_iterator')
%

category: 'Grail-Tests - struct'
method: StructBuffersAndHalfInitTestCase
testAFreshImportIsLetGo

	self assertAll: #('a_fresh_import_leaves_sys_modules_alone_and_is_collectable')
%

category: 'Grail-Tests - struct'
method: StructBuffersAndHalfInitTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 9 checks.  A check added to the fixture without being
	listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 9
%
