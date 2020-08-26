import sys
import time

def count_duplicates(lines):
    h, m = {}, 0
    for l in lines:
        if (l in h): h[l] += 1
        else: h[l] = 1
        if (m < h[l]): m = h[l]
    return h, m

def main():
    start = time.clock()
    count_duplicates(sys.stdin)
    end = time.clock()
    elapsed = (end - start) * 1000
    print(elapsed)

if __name__ == "__main__":
	main()