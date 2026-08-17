! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- copyreg class (Python 'copyreg' module)
expectvalue /Class
doit
module subclass: 'copyreg'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
copyreg comment:
'Python copyreg module.

Provides pickle/copy dispatch table registration.

Currently a minimal stub: `pickle(ob_type, pickle_function[,
constructor])` records `ob_type → pickle_function` in `dispatch_table`,
ignoring the `constructor` argument. The `re` module uses this to
register a pickler for compiled regex patterns
(`copyreg.pickle(Pattern, _pickle, _compile)`).

Methods on this class are real env-1 fast-path methods, dispatched
directly via `copyreg.method(args)` Python calls compiled to
`((copyreg) method: args)` Smalltalk sends.

See https://docs.python.org/3/library/copyreg.html
'
%

expectvalue /Class
doit
copyreg category: 'Grail-Modules'
%

expectvalue /Metaclass3
doit
copyreg removeAllMethods: 1.
copyreg class removeAllMethods: 1.
%

set compile_env: 1

! ===============================================================================
! Singleton initialization
! ===============================================================================

category: 'Grail-Initialization'
method: copyreg
initialize
	"Create the dispatch_table dictionary. The `dispatch_table` accessor reads
	this slot. The `pickle:_:` and `pickle:_:_:` methods write to it."

	self @env0:at: #dispatch_table put: (KeyValueDictionary @env0:new).
	"``super'' ships REGISTERED, exactly as CPython's copyreg does
	(``pickle(super, pickle_super)'' at module level).  The registration is what
	makes a super object copyable, and the reason it has to be out-of-band is
	that super must NOT define __reduce__ / __copy__ / __deepcopy__ of its own:
	attribute access on a super object resolves against the PARENT chain, so
	``s.__reduce__'' is the underlying object's reduce, and test_super's
	test_special_methods asserts both halves -- the three that must be equal to
	the object's own, and the five that must not exist at all.  A dispatch-table
	entry is keyed by TYPE and so is invisible to attribute lookup.

	Without it, copy.deepcopy took the generic path: Super's state lives in
	Smalltalk instance variables rather than a Python __dict__, so the generic
	reconstruction produced a NEW but EMPTY proxy -- ``type(u) is type(s)'' and
	``u is not s'' both held, and then ``u.f()'' raised ``'super' object has no
	attribute 'f''' because its cls and obj were nil (test_deep_copying)."
	self pickle: Super _: (BoundMethod receiver: self selector: #'pickle_super')
%

category: 'Grail-Built-in Functions'
method: copyreg
pickle_super: aSuper
	"CPython's copyreg.pickle_super, verbatim in shape:

	    def pickle_super(obj):
	        return super, (obj.__thisclass__, obj.__self__)

	A two-element reduction -- callable plus argument tuple -- so reconstruction
	is just ``super(thisclass, self)'', and copy.deepcopy recurses into the
	ARGUMENTS, which is what gives the copy a deep-copied __self__ while
	__thisclass__ stays the same class object.

	Registered from initialize rather than defined on Super, because a super
	object must not answer __reduce__ to attribute lookup; see there."

	^ tuple
		@env0:with: Super
		with: (tuple
			@env0:with: (aSuper @env1:___pyAttrLoad___: #'__thisclass__')
			with: (aSuper @env1:___pyAttrLoad___: #'__self__'))
%

! ===============================================================================
! Stored attribute (not a callable)
! ===============================================================================

category: 'Grail-Accessors'
method: copyreg
dispatch_table
	"Return the dispatch_table dictionary (stored attribute, populated
	by `initialize`)."

	^ self @env0:at: #dispatch_table
%

! ===============================================================================
! Fast-path methods
! ===============================================================================

category: 'Grail-Built-in Functions'
method: copyreg
pickle: obType _: pickleFunc
	"Python copyreg.pickle(ob_type, pickle_function) — fast path.
	2-arg form. Records `obType → pickleFunc` in dispatch_table."

	(self @env0:at: #dispatch_table) @env0:at: obType put: pickleFunc.
	^ None
%

category: 'Grail-Built-in Functions'
method: copyreg
pickle: obType _: pickleFunc _: constructor
	"Python copyreg.pickle(ob_type, pickle_function, constructor_ob)
	— fast path. 3-arg form. The `constructor` argument is currently
	ignored.

	The `re` module calls this form via
	`copyreg.pickle(Pattern, _pickle, _compile)` to register a
	pickler for compiled regex patterns."

	^ self pickle: obType _: pickleFunc
%

set compile_env: 0
