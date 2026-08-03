! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- PyCode class (Python 'code' object -- func.__code__)
expectvalue /Class
doit
object subclass: 'PyCode'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyCode comment:
'Python code object -- what ``func.__code__`` returns.

Grail has no bytecode, so this is a lightweight metadata carrier holding only
the fields conformance code actually reads: ``co_name``, ``co_qualname``,
``co_filename`` and ``co_firstlineno`` (the 1-based source line of the ``def``
keyword, populated from FunctionDefAst>>beginLine).  Fields live in dynamic
instVars so a Python attribute read (``co.co_firstlineno``) resolves the VALUE
directly through object>>___pyAttrLoad___''s dynamic-instVar probe -- no
accessor method and no ___pythonValueAttrs___ whitelist entry needed (same
mechanism as ``slice``).

Phase 1 of the traceback design (docs/Python_Traceback_Design.md) defines this
class; Phase 2 stamps a PyCode onto every function at def-time so
``func.__code__`` answers a real object instead of raising AttributeError.
'
%

expectvalue /Class
doit
PyCode category: 'Grail-Tracebacks'
%

! ------------------- Remove existing methods from PyCode
expectvalue /Metaclass3
doit
PyCode removeAllMethods.
PyCode class removeAllMethods.
PyCode removeAllMethods: 1.
PyCode class removeAllMethods: 1.
%

set compile_env: 0

! ===============================================================================
! Class methods - construction (env 0; called by codegen + Smalltalk callers)
! ===============================================================================

category: 'Instance Creation'
classmethod: PyCode
name: aName qualname: aQualname filename: aFilename firstlineno: aLine
	"Build a code object.  Fields are stored as dynamic instVars named exactly
	as the Python attributes so ``co.co_firstlineno`` reads the value straight
	through the ___pyAttrLoad___ dynamic-instVar probe."

	| inst |
	inst := self new.
	inst dynamicInstVarAt: #'co_name' put: aName.
	inst dynamicInstVarAt: #'co_qualname' put: aQualname.
	inst dynamicInstVarAt: #'co_filename' put: aFilename.
	inst dynamicInstVarAt: #'co_firstlineno' put: aLine.
	^ inst
%

category: 'Instance Creation'
classmethod: PyCode
name: aName firstlineno: aLine
	"Convenience for the def-time codegen stamp, which only has the def's
	name + line cheaply to hand: co_qualname defaults to the name and
	co_filename to a placeholder (neither is conformance-critical yet; a real
	file path is a later refinement)."

	^ self name: aName qualname: aName filename: '<grail>' firstlineno: aLine
%

! ===============================================================================
! Def-line lookup for defs that compiled to REAL methods (env 0)
!
! A nested def is a closure and carries its PyCode in the ExecBlock side table.
! A module-level / class-body / @classmethod / @staticmethod def becomes a real
! Smalltalk method instead, and there is no per-def object to hang a side table
! off -- the handles that stand for it (BoundMethod, UnboundMethod) are minted
! fresh on every attribute read.  So codegen records the def's Python line ON the
! compiled method, as a ``<___pyFirstLine___: N>'' pragma
! (FunctionDefAst>>emitPyFirstLinePragmaOn:), and these helpers read it back.
!
! A pragma is the right carrier: it is recompiled and reclaimed WITH the method,
! so there is nothing to invalidate and nothing to leak, and it survives commit
! (a SessionTemps registry would not).  Verified on 3.7.5 and 4.0.
! ===============================================================================

category: 'Grail-Def Line'
classmethod: PyCode
firstLineOfMethod: aMethod
	"The Python source line recorded on a compiled method, or nil when it
	carries no such pragma -- a kernel/builtin method, or a synthesized def
	with no source position.  Answers nil rather than raising so callers can
	report AttributeError the way CPython does for a method_descriptor."

	aMethod == nil ifTrue: [^ nil].
	aMethod pragmas do: [:p |
		(p keyword == #'___pyFirstLine___:' and: [p arguments size >= 1])
			ifTrue: [^ p arguments at: 1]].
	^ nil
%

category: 'Grail-Def Line'
classmethod: PyCode
firstLineOfPyName: aName in: aBehavior
	"The def line for the Python method named aName on aBehavior itself (no
	superclass walk -- see firstLineOfPyName:inChainFrom:).

	One Python def compiles to an ARITY-NAMED selector, so every form is
	tried: the unary name, the varargs ``_name:kw:'', then ``name:'',
	``name:_:'', ...  All forms are examined rather than stopping at the first
	that EXISTS, because the unary form can collide with an unrelated
	same-named accessor (a class attribute's reader, a kernel method) that
	carries no pragma and would otherwise shadow the real def."

	| md base line |
	aBehavior == nil ifTrue: [^ nil].
	md := aBehavior methodDictForEnv: 1.
	md == nil ifTrue: [^ nil].
	base := aName asString.
	line := self firstLineOfMethod: (md at: base asSymbol otherwise: nil).
	line == nil ifFalse: [^ line].
	line := self firstLineOfMethod:
		(md at: ('_' , base , ':kw:') asSymbol otherwise: nil).
	line == nil ifFalse: [^ line].
	"Fixed arities.  16 matches the ceiling BoundMethod>>_selectorForArgCount:
	builds for; a def with more positional parameters than that simply reports
	no line."
	1 to: 16 do: [:n |
		| sel |
		sel := WriteStream on: String new.
		sel nextPutAll: base; nextPut: $:.
		2 to: n do: [:i | sel nextPutAll: '_:'].
		line := self firstLineOfMethod: (md at: sel contents asSymbol otherwise: nil).
		line == nil ifFalse: [^ line]].
	^ nil
%

category: 'Grail-Def Line'
classmethod: PyCode
firstLineOfPyName: aName inChainFrom: aBehavior
	"As firstLineOfPyName:in:, walking the superclass chain so an INHERITED
	method reports the line where it was defined (which is what CPython's
	``Sub.inherited.__code__.co_firstlineno'' answers -- the code object is
	the base class's)."

	| walker line |
	walker := aBehavior.
	[walker == nil] whileFalse: [
		line := self firstLineOfPyName: aName in: walker.
		line == nil ifFalse: [^ line].
		walker := walker superclass].
	^ nil
%

set compile_env: 1

category: 'Grail-String Representation'
method: PyCode
__repr__
	"A <code object NAME, file FILE, line N> style string -- close enough to
	CPython for debugging; nothing conformance-critical reads this."

	| stream |
	stream := WriteStream @env0:on: (String ___new___).
	stream @env0:nextPutAll: '<code object '.
	stream @env0:nextPutAll: (self @env0:dynamicInstVarAt: #'co_name') @env0:asString.
	stream @env0:nextPutAll: ', file "'.
	stream @env0:nextPutAll: (self @env0:dynamicInstVarAt: #'co_filename') @env0:asString.
	stream @env0:nextPutAll: '", line '.
	stream @env0:nextPutAll: (self @env0:dynamicInstVarAt: #'co_firstlineno') @env0:printString.
	stream @env0:nextPut: $>.
	^ stream @env0:contents
%

set compile_env: 0
