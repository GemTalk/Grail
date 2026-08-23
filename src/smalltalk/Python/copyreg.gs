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
	"Nothing to do: the dispatch table is SESSION-LOCAL CLASS-SIDE state
	(``___dispatchTable___''), created on first read, rather than a slot on this
	instance.  See there for why -- a per-instance slot was pinned by any
	DEPLOYED module that had imported it.

	The ``super'' registration that used to live here moved into the table's
	lazy creator, so it is present for every reader in the session, including
	one that reaches the table through a stale instance without this session
	having imported copyreg at all.

	Kept as a method because ``module class >> instance'' calls ``initialize''
	on the instance it mints."

	^ self
%

category: 'Grail-Module Registry'
classmethod: copyreg
___dispatchTable___
	"The out-of-band reduction table (Python ``copyreg.dispatch_table''):
	TYPE -> reduction function.  SESSION-LOCAL, held CLASS-side in
	SessionTemps -- the same shape, and for the same reason, as
	``sys class >> modules'' (docs/Persistent_Modules_and_Classes.md par.8.7).

	WHY NOT A SLOT ON THE INSTANCE.  Module instances are session-local, so a
	slot on one is rebuilt every session -- and a DEPLOYED module that did
	``from copyreg import dispatch_table'' (copy.py and pickle.py both did)
	committed the DEPLOY session's dictionary into its globals and read that one
	forever.  Measured: ``copy.dispatch_table is copyreg.dispatch_table''
	answered false, and a later session's ``copyreg.pickle(...)'' was invisible
	to both copy and pickle -- silently in pickle's case, since a skipped
	reduction just falls through to the default.  Holding the table class-side
	means every holder of ANY copyreg instance, stale or fresh, reads this
	session's table.  (The vendored consumers were changed in the same commit to
	go through the module instead of capturing the dictionary, which is the
	other half: an early-bound name cannot be redirected.)

	``super'' is seeded HERE rather than in ``initialize'' so that it is
	registered even for a reader that never triggered this session's import."

	| st tbl |
	st := SessionTemps @env0:current.
	tbl := st @env0:at: #'GrailCopyregDispatchTable' otherwise: nil.
	tbl @env0:== nil ifTrue: [
		tbl := KeyValueDictionary @env0:new.
		st @env0:at: #'GrailCopyregDispatchTable' put: tbl.
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
		Smalltalk instance variables rather than a Python __dict__, so the
		generic reconstruction produced a NEW but EMPTY proxy -- ``type(u) is
		type(s)'' and ``u is not s'' both held, and then ``u.f()'' raised
		``super object has no attribute f'' because its cls and obj were nil
		(test_deep_copying)."
		tbl @env0:at: Super put:
			(BoundMethod receiver: self instance selector: #'pickle_super')].
	^ tbl
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
	"Python ``copyreg.dispatch_table''.  Delegates to the SESSION-LOCAL
	class-side table, so a stale (deploy-session) instance still answers the
	CURRENT session's table -- see ___dispatchTable___."

	^ (self @env0:class) ___dispatchTable___
%

! ===============================================================================
! Fast-path methods
! ===============================================================================

category: 'Grail-Built-in Functions'
method: copyreg
pickle: obType _: pickleFunc
	"Python copyreg.pickle(ob_type, pickle_function) — fast path.
	2-arg form. Records `obType → pickleFunc` in dispatch_table."

	((self @env0:class) ___dispatchTable___) @env0:at: obType put: pickleFunc.
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
