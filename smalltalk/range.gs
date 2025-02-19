! ------------------- Remove existing behavior from range
removeallmethods range
removeallclassmethods range
! ------------------- Class methods for range
category: 'Python'
classmethod: range
__call__: aPythonInt

	^(self __new__: aPythonInt) __init__: aPythonInt; yourself
%
category: 'Python'
classmethod: range
__call__: aPythonInt1 _: aPythonInt2

	^(self __new__: aPythonInt1 _: aPythonInt2) __init__: aPythonInt1 _: aPythonInt2; yourself
%
category: 'Python'
classmethod: range
__call__: aPythonInt1 _: aPythonInt2 _: aPythonInt3

	^(self __new__: aPythonInt1 _: aPythonInt2 _: aPythonInt3) __init__: aPythonInt1 _: aPythonInt2 _: aPythonInt3; yourself
%
category: 'Python'
classmethod: range
__new__: aPythonInt

	^self basicNew
%
category: 'Python'
classmethod: range
__new__: aPythonInt1 _: aPythonInt2

	^self basicNew
%
category: 'Python'
classmethod: range
__new__: aPythonInt1 _: aPythonInt2 _: aPythonInt3

	^self basicNew
%
category: 'Smalltalk'
classmethod: range
___containerClass

	^Interval
%
! ------------------- Instance methods for range
category: '(as yet unclassified)'
method: range
__init__: aPythonInt1 _: aPythonInt2 _: aPythonInt3

	container  := self class ___containerClass
		from: aPythonInt1 ___value
		to: aPythonInt2 ___value + (aPythonInt3 ___value > 0 ifTrue: [-1] ifFalse: [1])
		by: aPythonInt3 ___value.
	begin := aPythonInt1.
	end := aPythonInt2.
%
category: 'Python'
method: range
__bool__

	^self __len__ > 0
%
category: 'Python'
method: range
__contains__: anElement

	^container includes: anElement
%
category: 'Python'
method: range
__getItem__: index

	^container at: index + 1
%
category: 'Python'
method: range
__init__: aPythonInt

	container  := self class ___containerClass from: 0 to: aPythonInt ___value -1.
	begin := None.
	end := aPythonInt.
%
category: 'Python'
method: range
__init__: aPythonInt1 _: aPythonInt2

	container  := self class ___containerClass from: aPythonInt1 ___value to: (aPythonInt2 ___value - 1).
	begin := aPythonInt1.
	end := aPythonInt2.
%
category: 'Python'
method: range
__len__

	^self ___size
%
category: 'Python'
method: range
begin

	^begin
%
category: 'Python'
method: range
count: anElement

	^(self __contains__: anElement) ifTrue: [1] ifFalse: [0]
%
category: 'Python'
method: range
end

	^end
%
category: 'Python'
method: range
index: anElement

	^container indexOf: anElement
%
category: 'Python'
method: range
start

	^container first
%
category: 'Python'
method: range
step

	^container increment
%
category: 'Python'
method: range
stop

	^container last + 1
%
category: 'Smalltalk'
method: range
___container
	^container
%
category: 'Smalltalk'
method: range
___convertWithFlags: aSet precision: anObject andType: aCharacter

	"
	aSet contains the flags that are set for the input that are not used here
	anObject contains an empty string if there was no precision or an Integer if it was
	aCharacter contains the Type which will match one of the validTypes or invalidTypes
	"

	| validTypes invalidTypes return |
	validTypes := {$a. $s. $r. $c} asSet.
	invalidTypes := {
			$d->[TypeError signal: 'TypeError: %d format: a real number is required, not str'].
			$i->[TypeError signal: 'TypeError: %i format: a real number is required, not str'].
			$u->[TypeError signal: 'TypeError: %u format: a real number is required, not str'].
			$x->[TypeError signal: 'TypeError: %x format: an integer is required, not str'].
			$X->[TypeError signal: 'TypeError: %X format: an integer is required, not str'].
			$o->[TypeError signal: 'TypeError: %o format: an integer is required, not str'].
			$f->[TypeError signal: 'TypeError: must be real number, not str'].
			$F->[TypeError signal: 'TypeError: must be real number, not str'].
			$e->[TypeError signal: 'TypeError: must be real number, not str'].
			$E->[TypeError signal: 'TypeError: must be real number, not str'].
			$g->[TypeError signal: 'TypeError: must be real number, not str'].
			$G->[TypeError signal: 'TypeError: must be real number, not str'].
		} asDictionary.

	(validTypes includes: aCharacter) ifFalse: [
		(invalidTypes at: aCharacter) value.
	].

	(aCharacter == $r or: [aCharacter == $a])
		ifTrue: [
			return := self __repr__ ___value
		]
		ifFalse: [
			return := self __str__ ___value
		].
	(anObject ~= '' and: [anObject < return size]) ifFalse: [return := return copyFrom: 1 to: return size].
	^return
%
category: 'Smalltalk'
method: range
___size

	^self ___container size
%
category: 'Smalltalk'
method: range
___value
	^container
%
category: 'Smalltalk'
method: range
__repr__

	| stream |

	stream := WriteStream on: String new.
	
	stream nextPutAll: 'range('.
	self begin class == NoneType
		ifTrue: [
			stream nextPutAll: self end ___value asString.
		]
		ifFalse: [
			stream
				nextPutAll: self begin ___value asString;
				nextPut: $,;
				space;
				nextPutAll: self end ___value asString;
			yourself.
		

			self ___value increment == 1 ifFalse: [
				stream 
					nextPut: $,;
					space;
					nextPutAll: self ___value increment asString;
					yourself.
			].
		].
	stream nextPut: $).

	^(str ___value: stream contents)
%
