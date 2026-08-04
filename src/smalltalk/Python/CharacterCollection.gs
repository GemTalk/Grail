! ===============================================================================
!  CharacterCollection methods for 3.7.5 , that are already in server 4.0.0 base image 

category: 'Case-Sensitive Searching'
method: CharacterCollection
indexOfLast: aCharacter startingAt: startIndex

"Returns the index of the last occurrence of aCharacter
 in the receiver, starting from startIndex and searching backwards.
 If the receiver does not contain the specified Character, returns zero.

 The search is case-sensitive."

startIndex downTo: 1 do:[:n |
  (self at: n ) == aCharacter ifTrue:[ ^ n ].
].
^ 0
%
