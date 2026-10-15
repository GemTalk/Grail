Extension { #name : 'fractions' }

{ #category : 'Grail-Type Accessors' }
fractions >> Fraction [
	"Return the Fraction type exposed by this module (the GemStone
	Fraction class, populated by `initialize`)."

	^ self @env0:at: #fractionClass

]

{ #category : 'Grail-Initialization' }
fractions >> initialize [
	"Bind the Fraction attribute to GemStone's Fraction class. The
	`Fraction` accessor reads this slot."

	self @env0:at: #fractionClass put: Fraction

]
