! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'MixinMethodMetadataTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MixinMethodMetadataTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MixinMethodMetadataTestCase
!
! A METHOD REACHED THROUGH A SECOND BASE KEEPS ALL OF ITS METADATA.
!
! Grail merges multiple inheritance by RECOMPILING the secondary bases' methods
! onto the subclass -- Smalltalk is single-inheritance, so the subclass's
! superclass is only its PRIMARY base and the rest must be copied down.  But a
! method's Python metadata does not live in the method: ClassDefAst compiles it
! into five class-side tables built from ONE class body, so a copied method's
! metadata stays behind in the base's table, unreachable by a walk up the
! subclass's superclass chain.
!
! See tests/python/mixin_method_metadata.py and 9.50.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MixinMethodMetadataTestCase removeAllMethods.
MixinMethodMetadataTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Attribute Access'
method: MixinMethodMetadataTestCase
testMixinMethodMetadata
	"``Cls.method.__code__'' / ``__doc__'' / signature / ``__annotations__'' for a
	method merged in from a SECOND base.

	What it looked like for ``class Multi(unittest.TestCase, Mixin)'':

	    Multi.meth.__code__    -> AttributeError: 'method' object has no attribute
	    Multi.meth.__doc__     -> None
	    Multi().meth.__code__  -> the right PyCode

	The third line is the tell.  BoundMethod already consulted the C3 MRO -- it
	was taught to for test_gettext, where 13 tests reported ``'method' object has
	no attribute '__code__''' for a method that plainly existed -- so reading the
	very same method through an INSTANCE was right while reading it through the
	CLASS was wrong.  UnboundMethod had five copies of a plain superclass walk,
	one per metadata table (code, doc, signature, receiver, annotations), and all
	five had the defect; they are now one walk over the same chain BoundMethod
	uses.

	__code__ RAISING rather than answering None is what makes this reach past
	introspection: ``hasattr(x, '__code__')'' is how inspect and functools.wraps
	decide whether something is a function at all.

	Two of the checks are guard rails for what a WIDENED walk can newly get
	wrong.  precedence_follows_the_mro gives two bases the same method name and
	requires the metadata to come from wherever the call goes -- a walk that
	searched in the wrong order would report one docstring while the call ran the
	other method, which is worse than the AttributeError this fixes because
	nothing raises.  a_non_method_has_no_code requires that a plain class
	attribute still not claim to be a function.

	All fourteen checks answer identically under real CPython 3.14.6."

	| mod |
	importlib @env1:modules removeKey: #'mixin_method_metadata' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/mixin_method_metadata.py')
		name: 'mixin_method_metadata'.
	#( 'a_copied_method_has_a_code_object'
	   'a_copied_method_s_code_names_its_file'
	   'a_copied_method_s_code_knows_its_line'
	   'a_copied_method_keeps_its_docstring'
	   'a_copied_method_keeps_its_signature'
	   'a_copied_method_keeps_its_annotations'
	   'a_copied_classmethod_keeps_its_metadata'
	   'a_copied_staticmethod_keeps_its_metadata'
	   'the_class_and_the_instance_agree'
	   'single_inheritance_still_works'
	   'the_mixin_itself_still_works'
	   'hasattr_code_is_true_for_a_copied_method'
	   'precedence_follows_the_mro'
	   'a_non_method_has_no_code' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		self assert: (answer = true)
			description: 'mixin method-metadata check failed: ' , k
				, ' -> ' , answer printString]
%
