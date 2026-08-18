! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'EllipsisSingletonTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EllipsisSingletonTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EllipsisSingletonTestCase - ``Ellipsis'' as the singleton of a real type.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EllipsisSingletonTestCase removeAllMethods.
EllipsisSingletonTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Builtin Types'
method: EllipsisSingletonTestCase
testEllipsisIsASingletonOfItsOwnType
	"Grail modelled ``Ellipsis'' as the interned SYMBOL #'...'.  That made
	``... is Ellipsis'' true and stopped there; the rest was wrong in the way
	that reads as plausible:

		type(...)              Symbol      CPython: <class 'ellipsis'>
		repr(...)              ''''...''''   CPython: 'Ellipsis'
		isinstance(..., str)   True        CPython: False
		... == '...'           True        CPython: False

	The str-ness is the damaging one, and it is why an expedient in a core
	singleton is worse than an absence: code that sifts a heterogeneous sequence
	with ``isinstance(x, str)'' KEEPS the ellipsis and treats it as a name.
	CPython's own traceback.py does exactly that to a ``__dir__'' result before
	offering a ``Did you mean'' suggestion, which is how this was found -- from
	test_traceback's test_getattr_suggestions_with_custom___dir__, whose
	``__dir__'' returns ``[..., ''bluch'']''.

	Seventeen checks, all answering identically under real CPython, verified by
	running the fixture.  The eighteenth is a DIVERGENCE Grail keeps on purpose
	and is asserted in the opposite direction -- see
	testGrailDirDoesNotRaiseOnAnUnsortableDir.

	See tests/python/ellipsis_singleton.py."

	| mod |
	importlib @env1:modules removeKey: #'ellipsis_singleton' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ellipsis_singleton.py')
		name: 'ellipsis_singleton'.
	#( 'the_literal_is_the_ellipsis_singleton'
	   'its_type_is_named_ellipsis'
	   'types_ellipsistype_is_that_type'
	   'it_is_an_instance_of_ellipsistype'
	   'calling_the_type_answers_the_same_object'
	   'it_is_not_a_string'
	   'it_does_not_equal_its_own_spelling'
	   'a_dir_result_filters_it_out_as_a_non_string'
	   'repr_is_the_capitalised_name'
	   'str_falls_through_to_repr'
	   'format_falls_through_too'
	   'it_is_truthy'
	   'it_is_hashable_and_usable_as_a_key'
	   'ordering_it_raises_typeerror'
	   'reduce_answers_the_name_to_save_it_under'
	   'copy_preserves_identity'
	   'pickle_round_trips_to_the_same_object' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		self assert: (answer = true)
			description: 'ellipsis check failed: ' , k , ' -> ' , answer printString]
%

category: 'Grail-Tests - Builtin Types'
method: EllipsisSingletonTestCase
testGrailDirDoesNotRaiseOnAnUnsortableDir
	"The one place Grail deliberately differs, pinned so the difference is
	recorded rather than rediscovered.

	CPython's ``dir()'' SORTS its result, so a custom ``__dir__'' that mixes
	``...'' in with strings makes dir() itself raise TypeError.  Upstream treats
	that as a wart -- gh-131001 and gh-139933 were fixed by giving traceback.py a
	``_get_safe___dir__'' that calls ``obj.__dir__()'' directly, NOT by changing
	dir().  Grail's dir() does not raise.

	Matching CPython here would mean making a working call start raising, for a
	behaviour upstream itself routes around, so the divergence stands.  The
	fixture reports this one as XFAIL under CPython for the same reason."

	| mod |
	importlib @env1:modules removeKey: #'ellipsis_singleton' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ellipsis_singleton.py')
		name: 'ellipsis_singleton'.
	self assert: ((mod @env0:perform: #'dir_does_not_raise_on_an_unsortable_dir' env: 1) = true)
		description: 'Grail dir() should tolerate an unsortable __dir__'
%
