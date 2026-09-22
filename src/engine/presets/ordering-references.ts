import { reference } from '../reference';
import type { CodeLanguage, ReferenceCode } from '../types';
import type { OrderingId } from './ordering';

function refs(java: string, go: string, python: string, note = ''): Record<CodeLanguage, ReferenceCode> {
  return { java: reference(`class Solution {\n${java}\n}`, note), go: reference(`package main\n\n${go}`, note), python: reference(`class Solution:\n${python}`, note) };
}
export const orderingReferences: Record<OrderingId, Record<CodeLanguage, ReferenceCode>> = {
  'first-missing-positive': refs(
`    public int firstMissingPositive(int[] nums) {
        int n = nums.length; // @trace init
        for (int i = 0; i < n; i++) { // @trace inspect
            while (nums[i] >= 1 && nums[i] <= n && nums[nums[i]-1] != nums[i]) {
                int target = nums[i]-1, saved = nums[target];
                nums[target] = nums[i]; nums[i] = saved; // @trace swap
            }
        }
        int answer = n+1;
        for (int i = 0; i < n; i++) {
            if (nums[i] != i+1) { answer = i+1; break; } // @trace scan
        }
        return answer; // @trace return
    }`,
`func firstMissingPositive(nums []int) int {
    n := len(nums) // @trace init
    for i := 0; i < n; i++ { // @trace inspect
        for nums[i] >= 1 && nums[i] <= n && nums[nums[i]-1] != nums[i] {
            target := nums[i]-1
            nums[i],nums[target] = nums[target],nums[i] // @trace swap
        }
    }
    answer := n+1
    for i,value := range nums { if value != i+1 { answer = i+1; break } } // @trace scan
    return answer // @trace return
}`,
`    def firstMissingPositive(self, nums: list[int]) -> int:
        n = len(nums) # @trace init
        for i in range(n): # @trace inspect
            while 1 <= nums[i] <= n and nums[nums[i]-1] != nums[i]:
                target = nums[i]-1
                nums[i], nums[target] = nums[target], nums[i] # @trace swap
        answer = n+1
        for i, value in enumerate(nums):
            if value != i+1: # @trace scan
                answer = i+1
                break
        return answer # @trace return`, '原地归位；演示运行在输入副本上。'),
  'rotate-image': refs(
`    public int[][] rotate(int[][] matrix) {
        int n = matrix.length; // @trace init
        for (int r = 0; r < n; r++) for (int c = r+1; c < n; c++) {
            int saved = matrix[r][c]; matrix[r][c] = matrix[c][r]; matrix[c][r] = saved; // @trace transpose
        }
        for (int r = 0; r < n; r++) { // @trace phase
            for (int c = 0; c < n/2; c++) {
                int saved = matrix[r][c]; matrix[r][c] = matrix[r][n-1-c]; matrix[r][n-1-c] = saved; // @trace reverse
            }
        }
        return matrix; // @trace return
    }`,
`func rotate(matrix [][]int) [][]int {
    n := len(matrix) // @trace init
    for r := 0; r < n; r++ { for c := r+1; c < n; c++ {
        matrix[r][c],matrix[c][r] = matrix[c][r],matrix[r][c] // @trace transpose
    } }
    for r := 0; r < n; r++ { // @trace phase
        for c := 0; c < n/2; c++ {
            matrix[r][c],matrix[r][n-1-c] = matrix[r][n-1-c],matrix[r][c] // @trace reverse
        }
    }
    return matrix // @trace return
}`,
`    def rotate(self, matrix: list[list[int]]) -> list[list[int]]:
        n = len(matrix) # @trace init
        for r in range(n):
            for c in range(r+1,n):
                matrix[r][c],matrix[c][r] = matrix[c][r],matrix[r][c] # @trace transpose
        for r in range(n): # @trace phase
            for c in range(n//2):
                matrix[r][c],matrix[r][n-1-c] = matrix[r][n-1-c],matrix[r][c] # @trace reverse
        return matrix # @trace return`, '顺时针原地旋转；额外返回同一矩阵用于展示，平台 void 签名可省略返回。'),
  'search-a-2d-matrix': refs(
`    public boolean searchMatrix(int[][] matrix, int target) {
        int rows = matrix.length, cols = rows == 0 ? 0 : matrix[0].length; // @trace init
        int left = 0, right = rows*cols-1; boolean found = false;
        while (left <= right) {
            int mid = left+(right-left)/2, value = matrix[mid/cols][mid%cols]; // @trace compare
            if (value == target) { found = true; break; } // @trace found
            if (value < target) left = mid+1; // @trace right
            else right = mid-1; // @trace left
        }
        return found; // @trace return
    }`,
`func searchMatrix(matrix [][]int, target int) bool {
    rows,cols := len(matrix),0; if rows > 0 { cols = len(matrix[0]) } // @trace init
    left,right,found := 0,rows*cols-1,false
    for left <= right {
        mid := left+(right-left)/2; value := matrix[mid/cols][mid%cols] // @trace compare
        if value == target { found = true; break } // @trace found
        if value < target { left = mid+1 // @trace right
        } else { right = mid-1 } // @trace left
    }
    return found // @trace return
}`,
`    def searchMatrix(self, matrix: list[list[int]], target: int) -> bool:
        rows,cols = len(matrix),len(matrix[0]) if matrix else 0 # @trace init
        left,right,found = 0,rows*cols-1,False
        while left <= right:
            mid = (left+right)//2; value = matrix[mid//cols][mid%cols] # @trace compare
            if value == target:
                found = True # @trace found
                break
            if value < target:
                left = mid+1 # @trace right
            else:
                right = mid-1 # @trace left
        return found # @trace return`),
  'search-a-2d-matrix-ii': refs(
`    public boolean searchMatrix(int[][] matrix, int target) {
        int rows = matrix.length, col = rows == 0 ? -1 : matrix[0].length-1, row = 0; // @trace init
        boolean found = false;
        while (row < rows && col >= 0) {
            int value = matrix[row][col]; // @trace compare
            if (value == target) { found = true; break; } // @trace found
            if (value > target) col--; // @trace left
            else row++; // @trace down
        }
        return found; // @trace return
    }`,
`func searchMatrix(matrix [][]int, target int) bool {
    rows,row,col := len(matrix),0,-1; if rows > 0 { col = len(matrix[0])-1 } // @trace init
    found := false
    for row < rows && col >= 0 {
        value := matrix[row][col] // @trace compare
        if value == target { found = true; break } // @trace found
        if value > target { col-- // @trace left
        } else { row++ } // @trace down
    }
    return found // @trace return
}`,
`    def searchMatrix(self, matrix: list[list[int]], target: int) -> bool:
        rows,row,col = len(matrix),0,len(matrix[0])-1 if matrix else -1 # @trace init
        found = False
        while row < rows and col >= 0:
            value = matrix[row][col] # @trace compare
            if value == target:
                found = True # @trace found
                break
            if value > target:
                col -= 1 # @trace left
            else:
                row += 1 # @trace down
        return found # @trace return`),
  'find-minimum-in-rotated-sorted-array': refs(
`    public int findMin(int[] nums) {
        int left = 0, right = nums.length-1; // @trace init
        while (left < right) {
            int mid = left+(right-left)/2; // @trace compare
            if (nums[mid] > nums[right]) left = mid+1; // @trace right
            else right = mid; // @trace left
        }
        return nums[left]; // @trace return
    }`,
`func findMin(nums []int) int {
    left,right := 0,len(nums)-1 // @trace init
    for left < right {
        mid := left+(right-left)/2 // @trace compare
        if nums[mid] > nums[right] { left = mid+1 // @trace right
        } else { right = mid } // @trace left
    }
    return nums[left] // @trace return
}`,
`    def findMin(self, nums: list[int]) -> int:
        left,right = 0,len(nums)-1 # @trace init
        while left < right:
            mid = (left+right)//2 # @trace compare
            if nums[mid] > nums[right]:
                left = mid+1 # @trace right
            else:
                right = mid # @trace left
        return nums[left] # @trace return`, '要求非空、互异、由严格升序数组旋转得到。'),
  'median-of-two-sorted-arrays': refs(
`    public double findMedianSortedArrays(int[] a, int[] b) {
        if (a.length > b.length) return findMedianSortedArrays(b,a);
        int lo = 0, hi = a.length, half = (a.length+b.length+1)/2; // @trace init
        while (lo <= hi) {
            int i = (lo+hi)/2, j = half-i; // @trace cut
            double al = i == 0 ? Double.NEGATIVE_INFINITY : a[i-1];
            double ar = i == a.length ? Double.POSITIVE_INFINITY : a[i];
            double bl = j == 0 ? Double.NEGATIVE_INFINITY : b[j-1];
            double br = j == b.length ? Double.POSITIVE_INFINITY : b[j];
            if (al > br) hi = i-1; // @trace left
            else if (bl > ar) lo = i+1; // @trace right
            else {
                double result = (a.length+b.length)%2 == 1 ? Math.max(al,bl) : (Math.max(al,bl)+Math.min(ar,br))/2; // @trace median
                return result; // @trace return
            }
        }
        throw new IllegalArgumentException("Invalid arrays");
    }`,
`import "math"

func findMedianSortedArrays(a,b []int) float64 {
    if len(a) > len(b) { a,b = b,a }
    lo,hi,half := 0,len(a),(len(a)+len(b)+1)/2 // @trace init
    for lo <= hi {
        i := (lo+hi)/2; j := half-i // @trace cut
        al,ar,bl,br := math.Inf(-1),math.Inf(1),math.Inf(-1),math.Inf(1)
        if i > 0 { al = float64(a[i-1]) }; if i < len(a) { ar = float64(a[i]) }
        if j > 0 { bl = float64(b[j-1]) }; if j < len(b) { br = float64(b[j]) }
        if al > br { hi = i-1 // @trace left
        } else if bl > ar { lo = i+1 // @trace right
        } else {
            result := math.Max(al,bl); if (len(a)+len(b))%2 == 0 { result = (result+math.Min(ar,br))/2 } // @trace median
            return result // @trace return
        }
    }
    panic("Invalid arrays")
}`,
`    def findMedianSortedArrays(self, a: list[int], b: list[int]) -> float:
        if len(a) > len(b):
            a,b = b,a
        lo,hi,half = 0,len(a),(len(a)+len(b)+1)//2 # @trace init
        while lo <= hi:
            i = (lo+hi)//2; j = half-i # @trace cut
            al = a[i-1] if i else float('-inf')
            ar = a[i] if i < len(a) else float('inf')
            bl = b[j-1] if j else float('-inf')
            br = b[j] if j < len(b) else float('inf')
            if al > br:
                hi = i-1 # @trace left
            elif bl > ar:
                lo = i+1 # @trace right
            else:
                result = max(al,bl) if (len(a)+len(b))%2 else (max(al,bl)+min(ar,br))/2 # @trace median
                return result # @trace return
        raise ValueError('Invalid arrays')`, '两个数组均非递减，至少一个非空；运行时边界哨兵不作为真实元素。'),
};
