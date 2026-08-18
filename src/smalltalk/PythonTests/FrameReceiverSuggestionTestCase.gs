! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'FrameReceiverSuggestionTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FrameReceiverSuggestionTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FrameReceiverSuggestionTestCase - the suggestions that need the raising
! frame's receiver.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FrameReceiverSuggestionTestCase removeAllMethods.
FrameReceiverSuggestionTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Tracebacks'
method: FrameReceiverSuggestionTestCase
testASuggestionMayNameTheReceiver
	"CPython's traceback.py consults ``frame.f_locals['self']'' of the innermost
	frame twice while composing a ``Did you mean'': it answers an undefined bare
	name that is an attribute of the running instance with ``self.<name>'', and it
	stops hiding underscored candidates when a failed attribute access came from
	inside the object's own method.  Both are gated on the local literally being
	spelled ``self'', which is a statement about the SOURCE -- a module-level
	function has no such local, so neither behaviour applies there.

	Grail could do neither, and the two gaps were documented as blocked in
	traceback.py's own comments.  A Python method's ``self'' is not a frame
	temporary here -- it is the Smalltalk RECEIVER -- so it never appeared among
	the frame's names, and PyFrame>>___isInternalTempName___ dropped the spelling
	besides.  It cannot be recovered afterwards either: a traceback is rendered
	once the stack has unwound, from (method, ip, receiver) triples that carry no
	temporaries.  So the receiver is snapshotted at RAISE time, beside the names
	that were already being taken there.

	THE NAME COMES FROM THE SOURCE, NOT FROM THE FRAME.  Because Grail passes
	``self'' as the Smalltalk receiver, EVERY generated frame has a populated
	receiver slot -- a module-level def's included -- so no property of the frame
	can say whether its receiver is a Python ``self''.  The class-side
	``___methodReceiverTable___'' codegen already emits records the name each def
	declared, and that is what is consulted.  Guessing instead (``the receiver is a
	PythonInstance, so call it self'') would have put a ``self'' into the locals of
	every module-level function.

	AND NOT FROM THE BLOCK.  Codegen emits a method body as ``^ [ ... ] value'',
	so the frame carrying the ___curPos___ marker is a BLOCK's, and a zero-argument
	block reports hasReceiver=false with nil for both ``receiver'' and
	``selfValue''.  The receiver has to be read from the frame running the home
	METHOD, found by identity one or more levels further out.  Reading element 10
	of the marked frame instead answered the ExecBlock: an object with no
	attributes of the instance on it, so every suggestion that consulted it
	declined exactly as it had when there was no receiver at all -- a change that
	moved no test.

	THE CHECKS THAT KEEP THIS HONEST ARE THE NEGATIVE ONES, and each of the three
	caught a real over-reach while this was being written.
	``a_module_function_gets_no_self_suggestion'' is the receiver table's job.
	``a_nested_def_does_not_borrow_the_enclosing_self'' needed more: a nested def's
	BODY is a zero-argument block too, so its homeMethod is the enclosing method
	and numArgs alone did not tell the two apart -- resolved by asking whether the
	frame's ___curPos___ line falls inside a nested def, with the same resolver the
	live-stack walk uses to name such a frame.  And
	``a_lambda_does_not_borrow_the_enclosing_self'' needed different reasoning
	again: codegen emits a lambda's body INLINE in its two-argument entry block
	with no ___curPos___ at all, so the marker walk runs past the lambda entirely
	and lands on the enclosing method -- detected by noticing a two-argument block
	between the raise and the marked frame.

	That matters beyond the suggestion: it means a lambda has no frame of its own
	in Grail's marker walk, so the locals attributed to a raise inside one are the
	enclosing method's.  That was true before this change and is unaltered by it;
	what changed is only that the receiver is now withheld there rather than
	misreported.

	All twelve checks answer identically under real CPython, verified by running
	the fixture.  See tests/python/frame_receiver_suggestions.py."

	| mod |
	importlib @env1:modules removeKey: #'frame_receiver_suggestions' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/frame_receiver_suggestions.py')
		name: 'frame_receiver_suggestions'.
	#( 'a_method_gets_the_self_suggestion'
	   'the_self_suggestion_beats_a_nearer_local'
	   'a_module_function_gets_no_self_suggestion'
	   'a_nested_def_does_not_borrow_the_enclosing_self'
	   'a_lambda_does_not_borrow_the_enclosing_self'
	   'a_classmethod_receiver_is_not_self'
	   'an_underscored_candidate_is_offered_inside_the_class'
	   'an_underscored_candidate_is_hidden_outside_the_class'
	   'an_underscored_typo_is_offered_the_underscored_name_anywhere'
	   'a_getattr_raising_attributeerror_declines_quietly'
	   'a_getattr_raising_something_else_declines_quietly'
	   'format_exception_only_offers_no_self_suggestion' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		self assert: (answer = true)
			description: 'receiver suggestion check failed: ' , k , ' -> ' , answer printString]
%
