! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyDecoratedSiblingTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyDecoratedSiblingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyDecoratedSiblingTestCase - a class-body read of a decorated def (#1580).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyDecoratedSiblingTestCase removeAllMethods.
ClassBodyDecoratedSiblingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Class Body'
method: ClassBodyDecoratedSiblingTestCase
testAClassBodyReadOfADecoratedSiblingSeesTheDecoratorsResult
	"CPython applies a class-body decorator at its def, so a later statement of
	the body reads the decorated object.  Grail applied them after the body,
	and a class-body read of a sibling def answered the plain function: numpy's
	matrixlib (``getT = T.fget'' after ``@property def T'') and sqlalchemy's
	``@_state_dict_inst.classlevel'' over a hybridmethod both failed at import
	(#1580).

	Three changes: a decorator is applied at its def (ClassDefAst >>
	___defsDecoratedAtTheirPosition___); a class-body read of a sibling, and a
	decorator's, answers the namespace's value raw (object class >>
	___classBodySiblingValue___: / ___classBodyNamespaceValue___:); and a
	function's __get__ binds to a CLASS, which a hybridmethod's class read does.
	The last two checks are controls: a later def still wins, and an
	undecorated read is the function as before."

	| mod |
	importlib @env1:modules removeKey: #'class_body_decorated_sibling' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_decorated_sibling.py')
		name: 'class_body_decorated_sibling'.
	#( 'a_property_read_later_is_the_property'
	   'a_decorated_def_read_later_is_decorated'
	   'the_decorator_runs_at_the_def'
	   'a_decorator_reads_its_sibling_raw'
	   'a_function_binds_to_a_class'
	   "Controls."
	   'a_later_def_still_wins'
	   'an_undecorated_read_is_unchanged' ) do: [:k |
		| answer |
		answer := (mod @env1:RESULTS) @env1:__getitem__: k.
		self assert: (answer = true)
			description: 'decorated-sibling check failed: ' , k , ' -> '
				, answer printString]
%
