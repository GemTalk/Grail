! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'BoundMethodBindingTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BoundMethodBindingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BoundMethodBindingTestCase - a capture keeps meaning the function it captured.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BoundMethodBindingTestCase removeAllMethods.
BoundMethodBindingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Object Model'
method: BoundMethodBindingTestCase
testACaptureKeepsMeaningTheFunctionItCaptured
	"CPython's bound method holds the FUNCTION, so ``f = obj.m'' survives whatever
	later happens to the NAME.  Grail's BoundMethod holds a receiver and a
	SELECTOR and re-sends, so the capture runs whatever that selector resolves to
	at call time.

	``del D.m'' is where they came apart, and the failure was silent: CPython's
	capture still ran D's function, Grail's re-send fell through to the INHERITED
	one, so a caller that had asked for D's got Base's with no error anywhere.

	THE MECHANISM IS THE ONE BUILTINS REBINDING ALREADY HAD.  The original
	survives under a ``___grailOrig_'' selector -- source prepended, which renames
	exactly the first keyword part -- and the selector is pinned, so
	BoundMethod >> ___pinnedSelectorFor___:receiver: redirects a capture to it.
	Two things had to be added to generalise it past the builtins singleton:

	  * A GENERATION stamped on each BoundMethod at construction, because pinning
	    by selector alone cannot tell a capture that PREDATES the change from a
	    lookup made after it -- and after ``del D.m'' a fresh ``d.m'' must find
	    the inherited method while the older capture must not.
	  * The redirect RESOLVED BEFORE the responds-to lookups rather than at the
	    perform, because ``del'' removes every arity variant: asking whether the
	    receiver still understands the plain selector answered no, and the call
	    raised a TypeError about argument count instead of redirecting.  It only
	    appeared to work for a method whose name the receiver still inherited.

	The gate is a CLASS VARIABLE read, nil until something is actually pinned.
	A SessionTemps probe was measured here at 118% of a whole Python call -- more
	than the call it guards -- which is why the builtins version gated on an
	identity compare and why this one cannot simply reuse its registry.

	Five of the eight checks are CONTROLS: the delete must still be a real delete,
	a second delete must still raise, and the three cases that already agreed with
	CPython must not move."

	| mod |
	importlib @env1:modules removeKey: #'bound_method_binds_the_function' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/bound_method_binds_the_function.py')
		name: 'bound_method_binds_the_function'.
	#( 'a_capture_survives_deleting_the_class_method'
	   'a_capture_with_arguments_survives_the_delete'
	   "Controls: the delete is still a delete."
	   'deleting_the_class_method_really_deletes_it'
	   'deleting_it_twice_raises'
	   "Controls: what already matched CPython must not move."
	   'a_capture_is_unaffected_by_a_later_class_rebinding'
	   'a_capture_is_unaffected_by_a_later_instance_shadow'
	   'an_unbound_capture_is_unaffected_by_a_later_rebinding'
	   'a_plain_capture_still_works' ) do: [:k |
		| answer |
		answer := (mod @env1:RESULTS) @env1:__getitem__: k.
		self assert: (answer = true)
			description: 'bound-method binding check failed: ' , k , ' -> '
				, answer printString]
%
