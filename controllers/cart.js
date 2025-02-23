const { response } = require('express');
const { prisma } = require('../database/config');

const getCart = async (req, res = response) => {
  const { userID } = req.cookies
  try {
    const cart = await prisma.shoppingCart.findUnique({
      where: {
        userId: userID
      },
      include: {
        products: true
      }
    })

    if (!cart) {
      const createCart = await prisma.shoppingCart.create({
        data: {
          userId: userID,
          total: 0,
          amount: 0,
          products: {
            create: []
          }
        }
      })

      return res.status(200).json({
        data: createCart,
        message: 'Cart fetched successfully',
        success: true
      })
    }

    res.status(200).json({
      data: cart,
      message: 'Cart fetched successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from cart', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const createCart = async (req, res = response) =>{
  const { userID } = req.cookies
  try {

    const findCart = await prisma.shoppingCart.findUnique({
      where: {
        userId: userID
      }
    })

    if (findCart) {
      return res.status(400).json({
        data: findCart,
        message: 'Cart already exists',
        success: false
      })
    }

    const cart = await prisma.shoppingCart.create({
      data: {
        userId: userID,
        total: 0,
        amount: 0,
        products: {
          create: []
        }
      }
    })
    res.status(201).json({
      data: cart,
      message: 'Cart created successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from cart', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const updateProduct = async (req, res = response) => {
  const { product } = req.body
  const { userID } = req.cookies
  try {
    const cart = await prisma.shoppingCart.findUnique({
      where: {
        userId: userID
      },
      include: {
        products: true
      }
    })

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' })
    }

    const productExists = cart.products.find((p) => p.name === product.name)

    if (cart.products.length && productExists) {
      if (productExists.description.includes(product.description)) {
        return res.status(400).json({ error: 'Product already exists in cart' })
      } else {
        const productID = productExists.id
        await prisma.product.update({
          where: {
            id: productID
          },
          data: {
            description: product.description,
            price: product.price,
          }
        })
        await prisma.shoppingCart.update({
          where: {
            userId: userID
          },
          data: {
            total: cart.total + product.price - productExists.price,
          }
        })

        return res.status(200).json({
          data: true,
          message: 'Product updated successfully',
          success: true
        })
      }
    }

    const updatedCart = await prisma.shoppingCart.update({
      where: {
        userId: userID
      },
      data: {
        total: cart.total + product.price,
        amount: cart.amount + 1,
        products: {
          create: {
            name: product.name,
            price: product.price,
            image: product.image,
            description: product.description,
            link: product.link,
          }
        }
      },
      include: {
        products: true
      }
    })

    res.status(200).json({
      data: updatedCart,
      message: 'Product added to cart successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from cart/product', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const deleteProduct = async (req, res = response) => {
  const { productID } = req.params
  const { userID } = req.cookies
  try {
    const cart = await prisma.shoppingCart.findUnique({
      where: {
        userId: userID
      },
      include: {
        products: true
      }
    })

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' })
    }

    const product = await prisma.product.findUnique({
      where: {
        id: productID
      }
    })

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const updatedCart = await prisma.shoppingCart.update({
      where: {
        userId: userID
      },
      data: {
        total: cart.total - product.price,
        amount: cart.amount - 1,
        products: {
          delete: {
            id: productID
          }
        }
      },
      include: {
        products: true
      }
    })

    res.status(200).json({
      data: updatedCart,
      message: 'Product removed from cart successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from cart/product', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = {
  getCart,
  createCart,
  updateProduct,
  deleteProduct
}