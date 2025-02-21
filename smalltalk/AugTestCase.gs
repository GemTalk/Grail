! ------------------- Remove existing behavior from AugTestCase
removeallmethods AugTestCase
removeallclassmethods AugTestCase
! ------------------- Class methods for AugTestCase
category: 'other'
classmethod: AugTestCase
filename

	^nil
%
! ------------------- Instance methods for AugTestCase
category: 'other'
method: AugTestCase
testAugmentedAssignment
"| pyString result |

    pyString := 'sequence = ""abcdefg""
                 pos = 5
                 left = pos
                 right = pos + 1
                 substr = sequence[left:right]
                 while left > 0:
                     left -= 1'.
   
    result := ModuleAst evaluate: pyString.
"
%
