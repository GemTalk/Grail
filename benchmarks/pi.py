import time
from math import pow, factorial

# https://mathworld.wolfram.com/PiFormulas.html
def calculate_pi():
	n = 100
	pi = 0
	for k in range(n):
		pi += pow(2, k) * pow(factorial(k), 2) / factorial(2*k + 1)
	pi *= 2
	return pi

def main():
	start = time.clock()
	calculate_pi()
	end = time.clock()
	elapsed = (end - start) * 1000
	print(elapsed)

if __name__ == "__main__":
	main()