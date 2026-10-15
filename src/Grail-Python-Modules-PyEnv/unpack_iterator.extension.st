Extension { #name : 'unpack_iterator' }

{ #category : 'Grail-Instance Creation' }
unpack_iterator class >> ___new___ [
	"Allocate without #new, which this class refuses -- see there."

	^ self @env0:basicNew

]
