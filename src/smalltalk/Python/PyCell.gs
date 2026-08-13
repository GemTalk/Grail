! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- PyCell class (Python 'cell' object -- an element of func.__closure__)
expectvalue /Class
doit
object subclass: 'PyCell'
  instVarNames: #( reader setter )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyCell comment:
'Python cell object -- one element of ``func.__closure__``.

A cell is the box CPython puts a closed-over variable in, so that the defining
scope and every nested function share ONE binding rather than a copy.  Grail
has no such box: a free variable is read straight off the enclosing Smalltalk
block''s temp, which gets the same sharing for free and is why closures worked
long before this class existed.  What did not exist was any way to NAME that
binding as an object, which is what ``__closure__`` hands back.

So a PyCell holds the pair of blocks Grail already uses elsewhere to pass a
binding by reference (ClassDefAst''s ``___cell_<name>___`` reader and
``___cellSetter_<name>___`` writer): a zero-arg ``[x]`` that reads the
enclosing temp and a one-arg ``[:v | x := v]`` that writes it.  Smalltalk
blocks capture by reference, so ``cell_contents`` is LIVE -- it reports the
current value of the variable, and assigning it writes the binding the
enclosing scope and every sibling closure see.

KNOWN DEVIATION.  CPython gives sibling closures over one variable the SAME
cell object, so ``g.__closure__[0] is h.__closure__[0]`` is true when g and h
both close over x.  Grail builds a fresh PyCell per def, so that identity test
answers False here.  Both cells read and write the one underlying binding, so
every VALUE observation agrees with CPython; only object identity differs.
Closing the gap means giving the enclosing scope a per-variable cell temp to
hand out, which is a change to how captured variables are represented rather
than to this class.
'
%

expectvalue /Class
doit
PyCell category: 'Grail-Functions'
%

! ------------------- Remove existing methods from PyCell
expectvalue /Metaclass3
doit
PyCell removeAllMethods.
PyCell class removeAllMethods.
PyCell removeAllMethods: 1.
PyCell class removeAllMethods: 1.
%

set compile_env: 0

! ===============================================================================
! Class methods - construction (env 0; called by codegen)
! ===============================================================================

category: 'Instance Creation'
classmethod: PyCell
reader: aZeroArgBlock setter: aOneArgBlockOrNil
	"Build a cell over a binding, given the reader/writer block pair the def
	site emits.  aOneArgBlockOrNil is nil for a binding codegen cannot assign
	(the free variable of a def whose enclosing scope is not a plain block),
	which makes the cell read-only rather than unusable."

	| inst |
	inst := self new.
	inst ___setReader___: aZeroArgBlock setter: aOneArgBlockOrNil.
	^ inst
%

category: 'Instance Creation'
classmethod: PyCell
reader: aZeroArgBlock
	"A read-only cell -- no writer block."

	^ self reader: aZeroArgBlock setter: nil
%

! ===============================================================================
! Instance methods (env 0)
! ===============================================================================

category: 'Grail-private'
method: PyCell
___setReader___: aZeroArgBlock setter: aOneArgBlockOrNil

	reader := aZeroArgBlock.
	setter := aOneArgBlockOrNil.
%

category: 'Grail-private'
method: PyCell
___reader___

	^ reader
%

category: 'Grail-private'
method: PyCell
___setter___

	^ setter
%

set compile_env: 1

! ===============================================================================
! Python-visible behavior (env 1)
! ===============================================================================

category: 'Grail-Attribute Access'
method: PyCell
cell_contents
	"``cell.cell_contents'' -- the CURRENT value of the closed-over binding.

	Evaluates the reader block, so this tracks assignments made after the cell
	was built, which is the whole point of a cell.  #'cell_contents' is in
	___pythonValueAttrs___ so a read answers the value rather than a
	BoundMethod wrapping this selector."

	| r |
	r := self @env0:___reader___.
	r @env0:isNil ifTrue: [
		^ ValueError ___signal___: 'Cell is empty'].
	^ r @env0:value
%

category: 'Grail-Attribute Access'
method: PyCell
___setCellContents___: aValue
	"Backing for ``cell.cell_contents = value'' -- writes THROUGH to the
	enclosing binding via the setter block, so the defining scope and every
	other closure over that variable observe the new value."

	| s |
	s := self @env0:___setter___.
	s @env0:isNil ifTrue: [
		^ AttributeError ___signal___: 'readonly attribute'].
	s @env0:value: aValue.
	^ None
%

category: 'Grail-Printing'
method: PyCell
__repr__
	"``<cell at 0xADDR: EMPTY>'' / ``<cell at 0xADDR: TYPE object at 0xADDR>'',
	shaped like CPython's.  Nothing conformance-critical reads this."

	| stream r contents typeName |
	stream := AppendStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPutAll: '<cell at 0x'.
	stream @env0:nextPutAll:
		(self @env0:identityHash @env0:printStringRadix: 16) @env0:asLowercase.
	stream @env0:nextPutAll: ': '.
	r := self @env0:___reader___.
	r @env0:isNil
		ifTrue: [stream @env0:nextPutAll: 'empty']
		ifFalse: [
			contents := r @env0:value.
			contents @env0:isNil
				ifTrue: [stream @env0:nextPutAll: 'empty']
				ifFalse: [
					"The PYTHON type name (``int''), not the Smalltalk class
					(``SmallInteger'') -- same __qualname__-with-fallback read
					Object >> __repr__ uses, and a repr must not raise.  Bound to
					a temp first: written inline, the ``on:do:'' would be
					swallowed into a ``nextPutAll:on:do:'' selector."
					typeName := [ | qn |
						qn := contents @env0:class @env1:___pyAttrLoad___: #'__qualname__'.
						(qn isKindOf: CharacterCollection)
							ifTrue: [qn @env0:asString]
							ifFalse: [contents @env0:class @env0:name @env0:asString] ]
						@env0:on: AbstractException
						do: [:e | e @env0:return: contents @env0:class @env0:name @env0:asString].
					stream @env0:nextPutAll: typeName.
					stream @env0:nextPutAll: ' object at 0x'.
					stream @env0:nextPutAll:
						(contents @env0:identityHash @env0:printStringRadix: 16) @env0:asLowercase]].
	stream @env0:nextPut: $>.
	^ stream @env0:contents
%

! ___pythonValueAttrs___ MUST be compiled in env 0, and on the CLASS side:
! object>>___pyAttrLoad___ consults it through an env-0 ``respondsTo:'', which
! never sees an env-1 method (same requirement called out in Bool.gs, Bytes.gs
! and LruCacheWrapper.gs).  Filed in env 1 it compiles and is simply ignored,
! and ``cell.cell_contents'' answers a BoundMethod instead of the value.
set compile_env: 0

category: 'Grail-Python Attribute Hook'
classmethod: PyCell
___pythonValueAttrs___
	"``cell_contents'' is a VALUE attribute, not a callable: reading it must
	evaluate the accessor rather than hand back a BoundMethod wrapping it."

	^ IdentitySet new
		add: #'cell_contents';
		yourself
%

set compile_env: 1

! Leave the compiler in env 0: the next file filed by install.gs opens with a
! class-definition doit, which only ``Object class'' understands in env 0.
set compile_env: 0
