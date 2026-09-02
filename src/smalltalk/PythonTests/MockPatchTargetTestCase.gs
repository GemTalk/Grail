! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'MockPatchTargetTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MockPatchTargetTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MockPatchTargetTestCase - dotted class targets, and @patch as a decorator.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MockPatchTargetTestCase removeAllMethods.
MockPatchTargetTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Mock'
method: MockPatchTargetTestCase
testPatchResolvesDottedTargetsAndDecorates
	"Two gaps in Grail's patch, both of which a class-body decorator hid.

	It split the target at the LAST dot and treated everything before it as a
	MODULE path, so any target naming an attribute of a CLASS raised
	ModuleNotFoundError -- ``patch('_markupbase.ParserBase.reset')'' tried to
	import a module by that name.  And the decorator form was not implemented;
	the docstring said so.

	``@patch(...)'' on a test method is a class-body decorator, and Grail drops
	one whose application raises, so test_htmlparser's TestInheritance ran with
	nothing patched instead of reporting either problem.

	Stacking APPENDS to one wrapper rather than nesting, which is what CPython
	does and the only way to get its documented argument order: decorators
	apply bottom-up and the mocks arrive in that order.  Asserted against the
	patched attributes, not by count -- two interchangeable mocks would hide a
	reversal.

	Three of the eight checks are CONTROLS: the context-manager form and the
	plain ``module.attr'' target both already worked and must survive, and the
	decorated function is called TWICE to prove each call gets a fresh patcher
	rather than reusing one ``_old'' slot."

	| mod |
	importlib @env1:modules removeKey: #'mock_patch_dotted_and_decorator' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/mock_patch_dotted_and_decorator.py')
		name: 'mock_patch_dotted_and_decorator'.
	#( 'a_dotted_class_target_resolves'
	   'the_decorator_form_passes_the_mock'
	   "The order CPython documents, and the one nesting would get wrong."
	   'stacked_decorators_pass_mocks_bottom_up'
	   'the_decorator_restores_afterwards'
	   'the_decorated_function_can_be_called_twice'
	   'an_explicit_new_passes_no_extra_argument'
	   "Controls on the shapes that already worked."
	   'the_context_manager_form_still_works'
	   'a_dotted_module_target_still_works' ) do: [:k |
		| answer |
		answer := (mod @env1:RESULTS) @env1:__getitem__: k.
		self assert: (answer = true)
			description: 'patch target check failed: ' , k , ' -> ' , answer printString]
%
