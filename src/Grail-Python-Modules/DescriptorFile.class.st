"The file under an io.FileIO made over a descriptor, io.FileIO(fd).

GemStone opens a GsFile only by path, so a FileIO over a descriptor the
caller already has -- one os.open handed out -- has no GsFile to stand on.
This answers the part of GsFile's protocol FileIO sends, by reading, writing
and seeking the descriptor through os, so a failing call raises the OSError
os raises.

It is open while os still holds the descriptor as one it handed out
(os class >> ___openFds).  Any other descriptor -- the gem's own standard
streams, which io.FileIO(True) names -- is never open here, so FileIO
reports EBADF for it as os does, and the session cannot reach the gem's
descriptors through a file object either."
Class {
	#name : 'DescriptorFile',
	#superclass : 'Object',
	#instVars : [
		'descriptor'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Instance Creation' }
DescriptorFile class >> on: aDescriptor [

	^ self new initializeOn: aDescriptor

]

{ #category : 'Grail-Closing' }
DescriptorFile >> close [

	self isOpen ifTrue: [self operatingSystem @env1:close: descriptor]

]

{ #category : 'Grail-Private' }
DescriptorFile >> currentWhence [

	^ 1

]

{ #category : 'Grail-Private' }
DescriptorFile >> endWhence [

	^ 2

]

{ #category : 'Grail-Accessing' }
DescriptorFile >> fileDescriptor [

	^ descriptor

]

{ #category : 'Grail-Writing' }
DescriptorFile >> flush [

	"Nothing is buffered here: every write has already gone to the descriptor."

	^ self

]

{ #category : 'Grail-Initialization' }
DescriptorFile >> initializeOn: aDescriptor [

	descriptor := aDescriptor

]

{ #category : 'Grail-Testing' }
DescriptorFile >> isOpen [

	^ (os @env1:___openFds) includes: descriptor

]

{ #category : 'Grail-Testing' }
DescriptorFile >> isTerminal [

	^ self operatingSystem @env1:isatty: descriptor

]

{ #category : 'Grail-Reading' }
DescriptorFile >> next: aCount [

	"Up to aCount bytes, as GsFile answers them: a String, or nil at the end."

	| bytes |

	bytes := self operatingSystem @env1:read: descriptor _: aCount.
	bytes isEmpty ifTrue: [^ nil].
	^ String withBytes: bytes

]

{ #category : 'Grail-Reading' }
DescriptorFile >> nextLine [

	"The next line with its terminator, or nil at the end, read a byte at a
	time so that the descriptor is left just past it."

	| line chunk |

	line := WriteStream on: String new.
	[chunk := self next: 1.
	chunk notNil and: [
		line nextPutAll: chunk.
		chunk first ~= Character lf]] whileTrue.
	^ line contents ifEmpty: [nil]

]

{ #category : 'Grail-Writing' }
DescriptorFile >> nextPutAllBytes: someBytes [

	| written |

	written := 0.
	[written < someBytes size] whileTrue: [
		written := written + (self operatingSystem
			@env1:write: descriptor
			_: (someBytes copyFrom: written + 1 to: someBytes size))].
	^ written

]

{ #category : 'Grail-Private' }
DescriptorFile >> operatingSystem [

	^ os @env1:instance

]

{ #category : 'Grail-Positioning' }
DescriptorFile >> position [

	^ self seekBy: 0 from: self currentWhence

]

{ #category : 'Grail-Positioning' }
DescriptorFile >> position: anOffset [

	^ self seekBy: anOffset from: self startWhence

]

{ #category : 'Grail-Private' }
DescriptorFile >> seekBy: anOffset from: aWhence [

	^ self operatingSystem @env1:lseek: descriptor _: anOffset _: aWhence

]

{ #category : 'Grail-Positioning' }
DescriptorFile >> seekFromEnd: anOffset [

	^ self seekBy: anOffset from: self endWhence

]

{ #category : 'Grail-Positioning' }
DescriptorFile >> skip: aCount [

	^ self seekBy: aCount from: self currentWhence

]

{ #category : 'Grail-Private' }
DescriptorFile >> startWhence [

	^ 0

]
