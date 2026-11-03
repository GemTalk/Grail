Class {
	#name : 'UnsupportedOperation',
	#superclass : 'OSError',
	#category : 'Grail-Exceptions'
}

{ #category : 'Grail-Error Messages' }
UnsupportedOperation class >> ___messageFor: anOperationName [
	"IOBase refuses an operation a stream does not support with the
	operation's own name as the message (Modules/_io/iobase.c,
	iobase_unsupported): ``io.UnsupportedOperation: fileno''."

	^ anOperationName

]

