! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'AttributeCeilingTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AttributeCeilingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AttributeCeilingTestCase - the 255-attribute ceiling, and that it is catchable.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AttributeCeilingTestCase removeAllMethods.
AttributeCeilingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - attributes'
method: AttributeCeilingTestCase
testAttributeCeilingIsCatchable
	"Grail stores Python attributes as GemStone DYNAMIC INSTVARS, which cap at
	255 per object, so every Python object -- class, instance or module -- holds
	at most 255 attributes.  CPython has no such limit, so every check here
	asserts what GRAIL does and would answer differently there.

	The limit is not the point; section 9.41 records that lifting it means
	moving attribute storage off dynamic instVars, which is the whole attribute
	path.  The point is that hitting it is now SURVIVABLE.  It used to signal a
	Smalltalk ImproperOperation, which never passes through the env-1 mapping
	that makes Smalltalk errors catchable from Python: ``except Exception'' did
	not see it, and Python code could neither defend against the limit nor
	detect it.

	This test could not have existed before that changed.  A fixture that
	crossed the ceiling would have taken the whole SUnit run down with it --
	which was the argument for making it catchable first.

	MemoryError because CPython has no equivalent to raise here.  Any exception
	is non-conformant; the alternative was an uncatchable one, and section 9.10
	argues a wrong-but-catchable failure beats an uncatchable one.

	See tests/python/attribute_ceiling.py."

	| mod |
	importlib @env1:modules removeKey: #'attribute_ceiling' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/attribute_ceiling.py')
		name: 'attribute_ceiling'.
	#( 'an_instance_holds_255_attributes'
	   'a_class_holds_no_more_than_255_attributes'
	   'crossing_the_ceiling_raises_memoryerror'
	   'the_object_survives_the_failure'
	   'the_ceiling_is_per_object_not_global' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		self assert: (answer = true)
			description: 'attribute-ceiling check failed: ' , k , ' -> ' , answer printString]
%
