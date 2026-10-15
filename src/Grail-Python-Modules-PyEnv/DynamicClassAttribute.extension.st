Extension { #name : 'DynamicClassAttribute' }

{ #category : 'Grail-Descriptor Protocol' }
DynamicClassAttribute >> __get__: instance _: owner [
	"Instance access runs the getter, exactly as a property does.  CLASS access
	is REFUSED -- that is the entire point of the descriptor, and the one place
	it parts company with its superclass, which answers the descriptor itself.

	The message is the one an ordinary missing attribute produces, because to
	the caller that is what this is: CPython's DynamicClassAttribute.__get__
	raises a bare AttributeError so the class's own __getattr__ gets its turn."

	(instance == nil or: [instance == None]) ifTrue: [
		^ AttributeError @env0:___signalMissing___: self ___propName___ @env0:asString
			on: owner].
	^ super __get__: instance _: owner

]
