! ------------------- Superclass check
run
Object ifNil: [self error: 'Object is not defined. Check file ordering.'].
%

! ===============================================================================
! memoryview - a 1-D view over another object's bytes
! ===============================================================================

expectvalue /Class
doit
Object subclass: 'memoryview'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
memoryview category: 'Grail-Modules'
%

expectvalue /Class
doit
memoryview comment:
'A VIEW over another object''s bytes, as CPython''s memoryview is.

``memoryview'' used to be an identity stub -- builtins>>memoryview: answered its
argument unchanged -- whose own comment said "revisit when something actually
trips this".  Something did: wave.py''s _write_frames does
``memoryview(data).cast(''B'')'' for any non-bytes buffer, so
``f.writeframes(array.array(''h'', frames))'' raised
``''_array'' object has no attribute ''cast''''.  That message names the wrong
thing -- neither CPython''s array nor its bytes has ``cast''; memoryview has it,
and Grail had no memoryview to have it on.

A VIEW, NOT A COPY.  The source object is held and its bytes are re-derived on
every content read, so a mutation through the source is visible through the view
(and ``cast'' re-derives from the same source rather than from a snapshot).  A
copying implementation would have been much simpler and would have passed the
tests that prompted this, while quietly lying about the one property the type
exists to provide.

The fixed METADATA (format, itemsize, nbytes, shape) is captured at construction.
That is not a shortcut: CPython forbids resizing an object while a view over it
is exported, so the length cannot change under a live view.

Scope, stated rather than discovered later:
  * ONE-DIMENSIONAL only.  ndim is always 1; CPython''s multi-dimensional views
    (from arrays with shape/strides) are not modelled.
  * Integer formats only -- B b H h I i L l Q q -- plus the native-order
    assumption that Grail runs little-endian.  ''f''/''d'' and the struct
    modifiers raise ValueError from cast rather than answering wrong numbers.
  * The source must be bytes-like: a ByteArray (bytes/bytearray) or anything
    answering ``tobytes'' (array.array).  Anything else is a TypeError, as in
    CPython.'
%

removeallmethods memoryview
removeallclassmethods memoryview

set compile_env: 1

! ------------------- Construction

category: 'Grail-Instance Creation'
classmethod: memoryview
__new__: anObject
	"``memoryview(obj)''.

	The format follows the SOURCE: CPython answers 'B' for a bytes-like object
	and the array's own typecode for an array.array, so ``memoryview(array('h',
	...)).format'' is 'h'.  Reading it off the source is what makes
	``.cast('B')'' a reinterpretation rather than a no-op."

	| fmt |
	fmt := [| tc |
		tc := anObject @env1:___pyAttrLoad___: #'typecode'.
		((tc isKindOf: CharacterCollection) and: [tc @env0:size @env0:= 1])
			ifTrue: [tc @env0:asString]
			ifFalse: ['B']]
		@env0:on: AbstractException do: [:ex | ex @env0:return: 'B'].
	^ self ___over___: anObject format: fmt
%

category: 'Grail-Instance Creation'
classmethod: memoryview
___over___: anObject format: fmt
	"The shared constructor: a view over anObject reinterpreted as ``fmt'' items.

	Used by both ``memoryview(obj)'' and ``cast'', which differ only in the
	format -- cast passes the SAME source object through, so a cast view is still
	a view of the original and not of an intermediate copy."

	| inst size itemsize |
	itemsize := self ___itemsizeFor___: fmt.
	inst := self @env0:new.
	inst @env0:dynamicInstVarAt: #'_obj' put: anObject.
	"Validate by deriving once, so a non-buffer raises HERE rather than on the
	 first content read, where the traceback would name neither memoryview nor
	 the caller's object."
	size := (inst ___sourceBytes___) @env0:size.
	(size @env0:\\ itemsize) @env0:= 0 ifFalse: [
		ValueError ___signal___:
			'memoryview: length is not a multiple of itemsize'].
	inst @env0:dynamicInstVarAt: #'format' put: fmt.
	inst @env0:dynamicInstVarAt: #'itemsize' put: itemsize.
	inst @env0:dynamicInstVarAt: #'nbytes' put: size.
	inst @env0:dynamicInstVarAt: #'ndim' put: 1.
	inst @env0:dynamicInstVarAt: #'readonly' put: (self ___isReadOnly___: anObject).
	inst @env0:dynamicInstVarAt: #'shape'
		put: (tuple @env0:withAll: { size @env0:// itemsize }).
	inst @env0:dynamicInstVarAt: #'_released' put: false.
	^ inst
%

category: 'Grail-Instance Creation'
classmethod: memoryview
___itemsizeFor___: fmt
	"Bytes per item for a struct format character.

	Integer formats only.  A format this does not know is a ValueError naming it,
	which is what CPython raises for an unsupported cast -- deliberately NOT a
	default of 1, which would silently reinterpret 'f' data as bytes and answer
	numbers that look plausible."

	| s |
	s := (fmt isKindOf: CharacterCollection) ifTrue: [fmt @env0:asString] ifFalse: [nil].
	s isNil ifTrue: [
		TypeError ___signal___: 'memoryview: format argument must be a string'].
	(s @env0:= 'B' @env0:or: [s @env0:= 'b' @env0:or: [s @env0:= 'c']]) ifTrue: [^ 1].
	(s @env0:= 'H' @env0:or: [s @env0:= 'h']) ifTrue: [^ 2].
	(s @env0:= 'I' @env0:or: [s @env0:= 'i' @env0:or: [s @env0:= 'L' @env0:or: [s @env0:= 'l']]])
		ifTrue: [^ 4].
	(s @env0:= 'Q' @env0:or: [s @env0:= 'q']) ifTrue: [^ 8].
	ValueError ___signal___:
		('memoryview: unsupported format ' @env0:, s)
%

category: 'Grail-Instance Creation'
classmethod: memoryview
___isReadOnly___: anObject
	"Whether a view over anObject must refuse writes.

	Reported truthfully rather than always True: ``memoryview(bytearray).readonly''
	is False in CPython and code branches on it, and a flag that always said True
	would misdescribe the very views that can be written through.

	``isKindOf: bytearray'' is the test because Bytearray.gs declares
	``bytes subclass: 'bytearray''' -- a real Smalltalk class, so the mutable case
	is an identity question and not a string one.  The first version asked for a
	Python type NAME instead, which answered nil here and silently made every view
	read-only; the fixture's write_through check is what caught it."

	^ (anObject isKindOf: bytearray) @env0:not
%

! ------------------- Reading the source

category: 'Grail-Private'
method: memoryview
___sourceBytes___
	"The source's bytes, RE-DERIVED on every call.

	This is what makes the object a view: a write through the source (or through
	this view's own __setitem__) is visible to the next read, because nothing is
	cached between them.  Answers the live ByteArray for a ByteArray source, so a
	caller that mutates it mutates the source -- every public reader below copies
	before handing anything out."

	| o |
	self ___checkReleased___.
	o := self @env0:dynamicInstVarAt: #'_obj'.
	(o isKindOf: ByteArray) ifTrue: [^ o].
	"array.array and anything else that can render itself as bytes."
	^ [o @env1:tobytes]
		@env0:on: AbstractException
		do: [:ex |
			ex @env0:return:
				(TypeError ___signal___:
					'memoryview: a bytes-like object is required')]
%

category: 'Grail-Private'
method: memoryview
___checkReleased___
	"A released view refuses every operation, as CPython's does."

	((self @env0:dynamicInstVarAt: #'_released') @env0:= true) ifTrue: [
		ValueError ___signal___: 'operation forbidden on released memoryview object']
%

category: 'Grail-Private'
method: memoryview
___itemAt___: index
	"Item ``index'' (0-based) decoded per the view's format.

	Native byte order, which on every platform Grail runs on is LITTLE-ENDIAN;
	the class comment records that assumption rather than leaving it implicit.
	Signed formats (lower case, except 'c') are two's-complement."

	| bytes itemsize fmt base value signed limit |
	bytes := self ___sourceBytes___.
	itemsize := self @env0:dynamicInstVarAt: #'itemsize'.
	fmt := (self @env0:dynamicInstVarAt: #'format') @env0:asString.
	base := index @env0:* itemsize.
	value := 0.
	"Little-endian: byte j contributes bits 8*j.  ByteArray is 1-based."
	0 @env0:to: itemsize @env0:- 1 do: [:j |
		value := value @env0:+ ((bytes @env0:at: base @env0:+ j @env0:+ 1) @env0:bitShift: 8 @env0:* j)].
	signed := (fmt @env0:= 'b' @env0:or: [fmt @env0:= 'h' @env0:or: [fmt @env0:= 'i'
		@env0:or: [fmt @env0:= 'l' @env0:or: [fmt @env0:= 'q']]]]).
	signed ifTrue: [
		limit := 1 @env0:bitShift: (8 @env0:* itemsize) @env0:- 1.
		value @env0:>= limit ifTrue: [value := value @env0:- (limit @env0:* 2)]].
	^ value
%

! ------------------- Python protocol

category: 'Grail-Sequence Protocol'
method: memoryview
__len__
	"The number of ITEMS, not of bytes -- ``len(memoryview(b'abcd').cast('h'))''
	is 2 in CPython."

	self ___checkReleased___.
	^ (self @env0:dynamicInstVarAt: #'nbytes')
		@env0:// (self @env0:dynamicInstVarAt: #'itemsize')
%

category: 'Grail-Sequence Protocol'
method: memoryview
__getitem__: index
	"``mv[i]'' -- an INTEGER for every integer format, including 'B'.

	Note ``memoryview(b'abc')[0]'' is 97, not b'a': indexing a memoryview answers
	the item VALUE, unlike indexing bytes."

	| i n |
	self ___checkReleased___.
	n := self __len__.
	i := index.
	(i isKindOf: Integer) ifFalse: [
		TypeError ___signal___: 'memoryview: invalid slice key'].
	i @env0:< 0 ifTrue: [i := i @env0:+ n].
	(i @env0:< 0 @env0:or: [i @env0:>= n]) ifTrue: [
		IndexError ___signal___: 'index out of bounds on dimension 1'].
	^ self ___itemAt___: i
%

category: 'Grail-Sequence Protocol'
method: memoryview
__setitem__: index _: value
	"``mv[i] = v'' -- write THROUGH to the source, which is the other half of
	being a view.

	Byte formats only.  A wider format would need to split the value back across
	itemsize bytes, and nothing in the corpus does that yet -- so it raises
	rather than silently writing the low byte."

	| n i bytes itemsize |
	self ___checkReleased___.
	((self @env0:dynamicInstVarAt: #'readonly') @env0:= true) ifTrue: [
		TypeError ___signal___: 'cannot modify read-only memory'].
	itemsize := self @env0:dynamicInstVarAt: #'itemsize'.
	itemsize @env0:= 1 ifFalse: [
		NotImplementedError ___signal___:
			'memoryview: assignment is implemented for byte formats only'].
	n := self __len__.
	i := index.
	i @env0:< 0 ifTrue: [i := i @env0:+ n].
	(i @env0:< 0 @env0:or: [i @env0:>= n]) ifTrue: [
		IndexError ___signal___: 'index out of bounds on dimension 1'].
	((value isKindOf: Integer) and: [value @env0:>= 0 and: [value @env0:<= 255]])
		ifFalse: [
			ValueError ___signal___: 'memoryview: invalid value for format ''B'''].
	bytes := self ___sourceBytes___.
	bytes @env0:at: i @env0:+ 1 put: value.
	^ None
%

category: 'Grail-Sequence Protocol'
method: memoryview
__iter__
	"Iterating a memoryview yields its ITEMS."

	| out |
	self ___checkReleased___.
	out := OrderedCollection @env0:new.
	0 @env0:to: self __len__ @env0:- 1 do: [:i | out @env0:add: (self ___itemAt___: i)].
	^ (list @env0:withAll: out @env0:asArray) @env1:__iter__
%

! ------------------- Conversion

category: 'Grail-Conversion'
method: memoryview
cast: fmt
	"``mv.cast(fmt)'' -- reinterpret the SAME bytes as a different item type.

	This is the method wave.py reaches for, and the reason the whole class
	exists.  It views the ORIGINAL source object, so a cast of a cast is still a
	view of the thing the first memoryview was made from."

	self ___checkReleased___.
	^ memoryview ___over___: (self @env0:dynamicInstVarAt: #'_obj') format: fmt
%

category: 'Grail-Conversion'
method: memoryview
tobytes
	"``mv.tobytes()'' -- a COPY of the viewed bytes, as CPython's is.

	``ByteArray withAll:'' rather than ``copy'': Grail's bytes IS ByteArray and
	its bytearray is a SUBCLASS of it, so copying the source preserved the
	subclass and ``bytes(memoryview(bytearray(b'hi')))'' answered
	``bytearray(b'hi')'' -- mutable, and the wrong type.  CPython's tobytes always
	answers immutable bytes whatever the source was."

	^ ByteArray @env0:withAll: (self ___sourceBytes___)
%

category: 'Grail-Conversion'
method: memoryview
tolist
	"``mv.tolist()'' -- the items as a Python list."

	| out |
	self ___checkReleased___.
	out := OrderedCollection @env0:new.
	0 @env0:to: self __len__ @env0:- 1 do: [:i | out @env0:add: (self ___itemAt___: i)].
	^ list @env0:withAll: out @env0:asArray
%

category: 'Grail-Conversion'
method: memoryview
__bytes__
	"``bytes(mv)''."

	^ self tobytes
%

! ------------------- Lifetime

category: 'Grail-Lifetime'
method: memoryview
release
	"``mv.release()'' -- drop the view.  Every later operation raises
	ValueError, which is how CPython reports use after release."

	self @env0:dynamicInstVarAt: #'_released' put: true.
	^ None
%

category: 'Grail-Lifetime'
method: memoryview
__enter__
	"``with memoryview(b) as mv:'' -- the view itself."

	self ___checkReleased___.
	^ self
%

category: 'Grail-Lifetime'
method: memoryview
__exit__: excType _: excValue _: excTb
	"Leaving the ``with'' releases the view, as CPython does."

	self release.
	^ false
%

! ------------------- Comparison and display

category: 'Grail-Comparison'
method: memoryview
__eq__: other
	"CPython compares memoryviews by their ITEMS, and a memoryview compares equal
	to a bytes-like object with the same bytes."

	| mine theirs |
	((self @env0:dynamicInstVarAt: #'_released') @env0:= true) ifTrue: [^ false].
	mine := self ___sourceBytes___.
	theirs := (other isKindOf: memoryview)
		ifTrue: [other ___sourceBytes___]
		ifFalse: [(other isKindOf: ByteArray)
			ifTrue: [other]
			ifFalse: [^ ExecBlock @env0:___pyNotImplemented___]].
	^ mine @env0:= theirs
%

category: 'Grail-Comparison'
method: memoryview
__ne__: other
	| r |
	r := self __eq__: other.
	(r isKindOf: Boolean) ifFalse: [^ r].
	^ r @env0:not
%

category: 'Grail-Printing'
method: memoryview
__repr__
	"CPython prints the address; Grail's object repr already supplies one in the
	same shape, so this reports the identifying facts a reader wants instead."

	self ___checkReleased___ .
	^ ('<memory at 0x' @env0:, (self @env0:asOop @env0:printString: 16)
		@env0:, '>') @env0:asUnicodeString
%

set compile_env: 0

! ------------------- Smalltalk buffer protocol (environment 0)

category: 'Grail-Converting'
method: memoryview
asByteArray
	"The Smalltalk side of the buffer protocol.

	This is how Grail's own code asks a Python object for its bytes -- io_module's
	write path is ``(data isKindOf: ByteArray) ifTrue: [data] ifFalse: [data
	asByteArray]'', and fifteen sites across the Python dictionary use the same
	idiom.

	It has to be here, and env 0, because of what replacing the stub did: while
	``memoryview(x)'' answered x unchanged, every one of those sites got a real
	ByteArray for free.  Making memoryview a real type took that away and turned
	five PASSING test_wave tests into ``a memoryview does not understand
	#asByteArray'' -- test_write_memoryview had been passing precisely BECAUSE the
	view was not a view.  A new type that is more correct in Python can still be
	less useful to the Smalltalk that has to consume it; the buffer protocol is
	the bridge, and it is not optional.

	``@env1:'' on the send because this method is env 0 and ___sourceBytes___ is
	env 1: an unannotated send would look in env 0 and miss, which it duly did --
	the same five tests, now reporting ``does not understand
	#___sourceBytes___''.

	``ByteArray withAll:'' for the same reason tobytes uses it: a plain copy of a
	bytearray source stays a bytearray, and a caller asking for a buffer wants
	the immutable one."

	^ ByteArray @env0:withAll: (self @env1:___sourceBytes___)
%
