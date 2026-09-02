! ------------------- Superclass check
run
UnicodeError ifNil: [self error: 'UnicodeError is not defined. Check file ordering.'].
%

! ------- UnicodeDecodeError
expectvalue /Class
doit
UnicodeError subclass: 'UnicodeDecodeError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
UnicodeDecodeError category: 'Grail-Exceptions'
%

set compile_env: 1

category: 'Grail-Python Protocol'
method: UnicodeDecodeError
__str__
	"CPython's own wording, built from the five arguments:

	    'ascii' codec can't decode byte 0xff in position 1: ordinal not in range(128)
	    'utf-8' codec can't decode bytes in position 2-3: invalid continuation byte

	-- a single byte named and shown in hex, a longer span given as a
	RANGE.  BaseException's __str__ renders the args TUPLE when there is
	more than one, so a fully-formed decode error read
	``('charmap', b'a\xa5b', 1, 2, 'character maps to <undefined>')''.

	Falls back to inherited behaviour whenever the five are not all there:
	the raise sites that pass a bare message are still the majority, and a
	message is a better answer than a sentence assembled from nils."

	| enc obj st en why ws |
	enc := self encoding. obj := self object.
	st := self start. en := self end. why := self reason.
	(enc == nil or: [obj == nil or: [st == nil or: [en == nil or: [why == nil]]]])
		ifTrue: [^ super __str__].
	ws := WriteStream @env0:on: String @env0:new.
	ws @env0:nextPut: $'; @env0:nextPutAll: enc @env0:asString;
		@env0:nextPutAll: ''' codec can''t decode '.
	((en @env0:- st) @env0:= 1 and: [st @env0:< (obj @env0:size)])
		ifTrue: [
			ws @env0:nextPutAll: 'byte 0x';
				@env0:nextPutAll: (self ___twoHexDigits___: (obj @env0:at: st @env0:+ 1));
				@env0:nextPutAll: ' in position ';
				@env0:nextPutAll: st @env0:printString]
		ifFalse: [
			ws @env0:nextPutAll: 'bytes in position ';
				@env0:nextPutAll: st @env0:printString;
				@env0:nextPut: $-;
				@env0:nextPutAll: (en @env0:- 1) @env0:printString].
	ws @env0:nextPutAll: ': '; @env0:nextPutAll: why @env0:asString.
	^ ws @env0:contents
%

set compile_env: 0
