import { Component, type OnInit } from "@angular/core"
import { FormsModule } from "@angular/forms"
import { NgClass } from "@angular/common"
import type { Product } from "../../autentication/interface/product"
import { RouterLink } from "@angular/router"
import { AlertComponent } from "../../shared/models/alert/alert.component"
import { QuantityStatusComponent } from "../../shared/models/quantity-status/quantity-status.component"
import { PaginationComponent } from "../../shared/_component/pagination/pagination.component"
import { ProdutoService } from "../../autentication/service/produto/produto.service"

@Component({
  selector: "app-home",
  standalone: true,
  imports: [FormsModule, RouterLink, NgClass, AlertComponent, QuantityStatusComponent, PaginationComponent],
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.css",
})
export class HomeComponent implements OnInit {
  produto: Product[] = []
  idProduct = 0
  selectedProductId: number | null = null
  selectedProducts: number[] = []
  allSelected = false
  isDeleteModalOpen = false
  isInfoModalOpen = false
  isOpen = false
  categories: string[] = []
  selectedCategory = "Categories"
  defaultCategoryText = "Categories"
  search = ""

  showAlert = false
  message = ""
  categAlert = 0

  itemsPerPage = 10 // Quantos produtos por página
  currentPage = 1

  constructor(private produtoService: ProdutoService) {}

  ngOnInit() {
    this.listProducts()
    this.loadCategories()
    this.selectedCategory = this.defaultCategoryText
  }

  listByCategory() {
    if (this.selectedCategory === this.defaultCategoryText) {
      this.listProducts()
      return
    }

    this.produtoService.listByCategory(this.selectedCategory).subscribe({
      next: (data: any) => {
        this.produto = data
        this.selectedProducts = []
        this.allSelected = false
        this.currentPage = 1 // Reset to first page when filtering
      },
      error: (error) => {
        console.error("Error listing products by category:", error)
        this.alertError("Erro ao listar produtos por categoria. Por favor, tente novamente.")
      },
    })
  }

  searchProduct(name: string) {
    if (name === "") {
      this.listProducts()
      return
    }

    this.produtoService.getProdutoByName(name).subscribe({
      next: (data: any) => {
        console.log("Raw search response:", data) // Log the raw response

        // Check if data is an array
        if (Array.isArray(data)) {
          this.produto = data.map((product) => {
            // Ensure quantity exists and is a number
            return {
              ...product,
              quantity:
                product.quantity !== undefined && product.quantity !== null
                  ? Number(product.quantity) // Convert to number to ensure it's numeric
                  : 0,
            }
          })
        } else if (data && typeof data === "object") {
          // If it's a single object, convert to array with quantity check
          this.produto = [
            {
              ...data,
              quantity:
                data.quantity !== undefined && data.quantity !== null
                  ? Number(data.quantity) // Convert to number to ensure it's numeric
                  : 0,
            },
          ]
        } else {
          // Empty array if no data
          this.produto = []
        }

        this.selectedProducts = []
        this.allSelected = false
        this.currentPage = 1 // Reset to first page when searching

        console.log("Processed search results:", this.produto)
      },
      error: (error) => {
        console.error("Error searching for product:", error)
        this.alertError("Erro ao buscar produto. Por favor, tente novamente.")
        this.produto = []
      },
    })
  }

  listProducts() {
    this.produtoService.getProdutos().subscribe((data: any) => {
      this.produto = data
      this.selectedProducts = []
      this.allSelected = false
      this.currentPage = 1 // Reset to first page when loading new data
    })
  }

  loadCategories() {
    this.produtoService.getCategories().subscribe({
      next: (data: string[]) => {
        this.categories = data
        console.log("Categories loaded:", this.categories)
      },
      error: (error) => {
        console.error("Error loading categories:", error)
        this.alertError("Erro ao carregar categorias. Por favor, tente novamente.")
      },
    })
  }

  selectCategory(category: string | null) {
    if (category === null) {
      this.selectedCategory = this.defaultCategoryText
      this.listProducts() // Quando limpar a categoria, mostrar todos os produtos
      console.log("No category selected")
    } else {
      this.selectedCategory = category
      console.log("Selected category:", category)
      this.listByCategory() // Chamar listByCategory quando uma categoria for selecionada
    }
    this.isOpen = false
  }

  toggleSelectAll() {
    this.allSelected = !this.allSelected

    // Only select products on the current page
    if (this.allSelected) {
      this.selectedProducts = this.paginatedProducts.map((p) => p.id || 0).filter((id) => id !== 0)
    } else {
      this.selectedProducts = []
    }

    this.idProduct = this.selectedProducts.length > 0 ? this.selectedProducts[0] : 0
    console.log("Produtos selecionados:", this.selectedProducts)
  }

  isProductSelected(productId: number): boolean {
    return this.selectedProducts.includes(productId)
  }

  selectProduct(productId: number) {
    const index = this.selectedProducts.indexOf(productId)
    if (index === -1) {
      this.selectedProducts.push(productId)
      this.idProduct = productId
    } else {
      this.selectedProducts.splice(index, 1)
      this.idProduct = this.selectedProducts.length > 0 ? this.selectedProducts[this.selectedProducts.length - 1] : 0
    }

    // Check if all products on the current page are selected
    this.allSelected =
      this.paginatedProducts.length > 0 &&
      this.paginatedProducts.every((p) => this.selectedProducts.includes(p.id || 0))

    console.log("Produtos selecionados:", this.selectedProducts)
  }

  deleteProduct() {
    if (this.selectedProducts.length === 0) {
      this.closeModal()
      return
    }
    if (this.selectedProducts.length === 1) {
      this.produtoService.deleteProduct(this.selectedProducts[0]).subscribe({
        next: () => {
          this.listProducts()
          this.closeModal()
          this.alertSuccess("Produto excluído com sucesso!")
        },
        error: (error) => this.handleDeleteError(error),
      })
    } else {
      this.deleteMultipleProducts()
    }
  }

  get totalPages() {
    return Math.ceil(this.produto.length / this.itemsPerPage)
  }

  get paginatedProducts() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage
    return this.produto.slice(startIndex, startIndex + this.itemsPerPage)
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page

      // Update allSelected state for the new page
      this.allSelected =
        this.paginatedProducts.length > 0 &&
        this.paginatedProducts.every((p) => this.selectedProducts.includes(p.id || 0))
    }
  }

  private deleteMultipleProducts() {
    let successCount = 0,
      errorCount = 0
    const productsToDelete = [...this.selectedProducts]

    const deleteNext = (index: number) => {
      if (index >= productsToDelete.length) {
        this.listProducts()
        this.closeModal()
        this.showDeletionResult(successCount, errorCount)
        return
      }
      this.produtoService.deleteProduct(productsToDelete[index]).subscribe({
        next: () => {
          successCount++
          deleteNext(index + 1)
        },
        error: () => {
          errorCount++
          deleteNext(index + 1)
        },
      })
    }
    deleteNext(0)
  }

  private showDeletionResult(successCount: number, errorCount: number) {
    if (successCount > 0 && errorCount === 0) {
      this.alertSuccess(`${successCount} produtos excluídos com sucesso!`)
    } else if (successCount > 0 && errorCount > 0) {
      this.alertWarning(
        `${successCount} produtos excluídos com sucesso, mas ${errorCount} produtos não puderam ser excluídos.`,
      )
    } else {
      this.alertError(`Nenhum produto pôde ser excluído. Por favor, tente novamente.`)
    }
  }

  private handleDeleteError(error: any) {
    if (error.status === 500 && error.error && JSON.stringify(error.error).includes("constraint")) {
      this.alertError("Este produto não pode ser excluído pois está associado a uma ou mais vendas.")
    } else {
      const messages: { [key: number]: string } = {
        500: "Erro interno do servidor. Por favor, tente novamente mais tarde.",
        404: "Produto não encontrado. Ele pode já ter sido excluído.",
        403: "Você não tem permissão para excluir este produto.",
      }
      this.alertError(messages[error.status] || "Erro desconhecido. Por favor, tente novamente.")
    }
  }

  showDeleteModal() {
    this.isDeleteModalOpen = true
    this.isInfoModalOpen = false
  }

  showInfoModal(productId?: number) {
    if (productId) {
      this.selectedProductId = productId
    }
    this.isInfoModalOpen = true
    this.isDeleteModalOpen = false
  }

  closeModal() {
    this.isDeleteModalOpen = false
    this.isInfoModalOpen = false
    this.selectedProductId = null
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen
  }

  alertError(message: string) {
    this.showAlert = true
    this.message = message
    this.categAlert = 2
    this.closeModal()
  }

  alertSuccess(message: string) {
    this.showAlert = true
    this.message = message
    this.categAlert = 3
  }

  alertWarning(message: string) {
    this.showAlert = true
    this.message = message
    this.categAlert = 4
  }

  isCategorySelected(): boolean {
    return this.selectedCategory !== this.defaultCategoryText
  }

  clearCategorySelection() {
    this.selectCategory(null)
  }

  Number(value: any): number {
    const num = Number(value)
    return isNaN(num) ? 0 : num
  }
}

